import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { once } from "events";
import type { SupabaseClient } from "@supabase/supabase-js";
import { backupBucketName, backupVersion, requiredBuckets, requiredTables, type BackupManifest, type BackupPackagePart } from "@/lib/server/backupConfig";
import { extractBackupArchive } from "@/lib/server/backupRestoreArchive";
import { validateBackupArchive, type BackupValidationReport } from "@/lib/server/backupValidator";

export type StoredBackupVerificationStatus = "VALIDATED" | "INVALID" | "INCOMPLETE" | "NOT_VERIFIED" | "BLOCKED";

export type StoredBackupVerificationCheck = {
  name: string;
  status: "passed" | "failed" | "warning" | "not_verified" | "blocked";
  details: string;
};

export type StoredBackupVerificationReport = {
  status: StoredBackupVerificationStatus;
  backup_id: string;
  generated_at: string;
  archive_retrieved: boolean;
  package_version?: string;
  manifest_backup_id?: string;
  completed_at?: string | null;
  package_size_bytes_expected?: number | null;
  package_size_bytes_retrieved?: number;
  package_sha256_expected_available: boolean;
  package_sha256_verified: boolean;
  validation?: BackupValidationReport;
  complete_recovery_manifest_present: boolean;
  complete_recovery_summary?: BackupManifest["complete_recovery_manifest"]["summary"];
  total_records_verified?: number;
  total_storage_files_verified?: number;
  checks: StoredBackupVerificationCheck[];
  errors: string[];
  warnings: string[];
  statement: string;
};

type BackupJobForStoredVerification = {
  id: string;
  status: string | null;
  backup_version: string | null;
  package_path: string | null;
  package_sha256: string | null;
  package_size_bytes: number | null;
  manifest: BackupManifest | null;
  error_message?: string | null;
  completed_at?: string | null;
  created_at: string;
};

const maxStoredPackageVerificationBytes = 1024 * 1024 * 1024;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isSafeBackupStoragePath(backupId: string, storagePath: string) {
  if (!storagePath || storagePath.startsWith("/") || storagePath.includes("\\") || storagePath.includes("..")) return false;
  return storagePath.startsWith(`${backupId}/`);
}

function getStoredPackageFileName(packagePath: string) {
  return path.basename(packagePath).replace(/[^\w.\-() ]/g, "_");
}

function addCheck(checks: StoredBackupVerificationCheck[], status: StoredBackupVerificationCheck["status"], name: string, details: string) {
  checks.push({ name, status, details });
}

function countRequiredTables(manifest?: BackupManifest | null) {
  const tableNames = new Set((manifest?.tables || []).map((table) => table.table));
  return requiredTables.filter((table) => tableNames.has(table)).length;
}

function countRequiredBuckets(manifest?: BackupManifest | null) {
  const bucketNames = new Set((manifest?.buckets || []).map((bucket) => bucket.bucket));
  return requiredBuckets.filter((bucket) => bucketNames.has(bucket)).length;
}

function sumRecords(manifest?: BackupManifest | null) {
  return Object.values(manifest?.row_counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function sumFiles(manifest?: BackupManifest | null) {
  return (manifest?.buckets || []).reduce((sum, bucket) => sum + Number(bucket.object_count || 0), 0);
}

function buildReport(params: {
  status: StoredBackupVerificationStatus;
  backupId: string;
  archiveRetrieved?: boolean;
  job?: BackupJobForStoredVerification | null;
  validation?: BackupValidationReport;
  packageSizeBytesRetrieved?: number;
  packageSha256Verified?: boolean;
  manifest?: BackupManifest | null;
  checks: StoredBackupVerificationCheck[];
  errors?: string[];
  warnings?: string[];
}): StoredBackupVerificationReport {
  const { status, backupId, archiveRetrieved = false, job, validation, packageSizeBytesRetrieved, packageSha256Verified = false, manifest, checks } = params;
  return {
    status,
    backup_id: backupId,
    generated_at: new Date().toISOString(),
    archive_retrieved: archiveRetrieved,
    package_version: manifest?.backup_version || validation?.backup_version || job?.backup_version || undefined,
    manifest_backup_id: manifest?.backup_id || validation?.backup_id,
    completed_at: job?.completed_at || null,
    package_size_bytes_expected: job?.package_size_bytes ?? null,
    package_size_bytes_retrieved: packageSizeBytesRetrieved,
    package_sha256_expected_available: Boolean(job?.package_sha256),
    package_sha256_verified: packageSha256Verified,
    validation,
    complete_recovery_manifest_present: Boolean(manifest?.complete_recovery_manifest || validation?.complete_recovery_manifest?.present),
    complete_recovery_summary: manifest?.complete_recovery_manifest?.summary || validation?.complete_recovery_manifest?.summary,
    total_records_verified: manifest ? sumRecords(manifest) : validation?.total_records,
    total_storage_files_verified: manifest ? sumFiles(manifest) : validation?.total_files,
    checks,
    errors: params.errors || [],
    warnings: [
      ...(params.warnings || []),
      "Stored package validation confirms only the supported backup package bytes and implemented package checks. It does not prove full-project recoverability, schema recovery, Auth user recovery, deployment recovery, or restore success.",
    ],
    statement: "This validation is strictly non-mutating and does not create restore jobs, audit logs, backup jobs, database records, or Storage objects.",
  };
}

async function getBackupJob(admin: SupabaseClient, backupId: string) {
  const { data, error } = await (admin as any)
    .from("backup_jobs")
    .select("id, status, backup_version, package_path, package_sha256, package_size_bytes, manifest, error_message, completed_at, created_at")
    .eq("id", backupId)
    .maybeSingle();

  if (error) throw error;
  return data as BackupJobForStoredVerification | null;
}

async function downloadStorageObject(admin: SupabaseClient, storagePath: string) {
  const { data, error } = await admin.storage.from(backupBucketName).download(storagePath);
  if (error) throw error;
  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer;
}

async function writeBuffer(stream: fs.WriteStream, buffer: Buffer) {
  if (!stream.write(buffer)) {
    await once(stream, "drain");
  }
}

function getPackageParts(job: BackupJobForStoredVerification) {
  const parts = Array.isArray(job.manifest?.package_parts) ? job.manifest.package_parts : [];
  return parts
    .filter((part): part is BackupPackagePart => Boolean(part?.storage_path && part?.part_number))
    .sort((left, right) => left.part_number - right.part_number);
}

async function reconstructStoredPackage(admin: SupabaseClient, job: BackupJobForStoredVerification, outputPath: string, checks: StoredBackupVerificationCheck[]) {
  const packageHash = crypto.createHash("sha256");
  const writer = fs.createWriteStream(outputPath);
  let totalBytes = 0;
  let packageSha256Verified = false;

  try {
    const parts = getPackageParts(job);
    const storagePaths = parts.length > 0 ? parts.map((part) => part.storage_path) : [String(job.package_path || "")];

    if (parts.length > 0) {
      addCheck(checks, "passed", "Package parts", `${parts.length} checksum-tracked backup package part(s) are listed in the manifest.`);
    } else {
      addCheck(checks, "passed", "Package parts", "Backup package is stored as a single Storage object.");
    }

    for (const storagePath of storagePaths) {
      if (!isSafeBackupStoragePath(job.id, storagePath)) {
        throw new Error("Backup package Storage path is unsafe or does not belong to the requested backup ID.");
      }

      const buffer = await downloadStorageObject(admin, storagePath);
      totalBytes += buffer.length;

      if (totalBytes > maxStoredPackageVerificationBytes) {
        throw new Error("Stored backup package exceeds the 1 GB verification limit.");
      }

      const part = parts.find((item) => item.storage_path === storagePath);
      if (part) {
        const partHash = crypto.createHash("sha256").update(buffer).digest("hex");
        if (partHash !== part.sha256 || buffer.length !== part.size) {
          throw new Error(`Stored backup package part failed checksum or size verification: part ${part.part_number}.`);
        }
      }

      packageHash.update(buffer);
      await writeBuffer(writer, buffer);
    }
  } finally {
    writer.end();
    await once(writer, "finish");
  }

  const actualSha256 = packageHash.digest("hex");
  if (job.package_sha256) {
    packageSha256Verified = actualSha256 === job.package_sha256;
    addCheck(
      checks,
      packageSha256Verified ? "passed" : "failed",
      "Package SHA-256",
      packageSha256Verified ? "Stored package SHA-256 matches backup job metadata." : "Stored package SHA-256 does not match backup job metadata."
    );
  } else {
    addCheck(checks, "not_verified", "Package SHA-256", "Backup job metadata does not include a package SHA-256 to compare.");
  }

  if (job.package_size_bytes) {
    addCheck(
      checks,
      totalBytes === Number(job.package_size_bytes) ? "passed" : "failed",
      "Package size",
      totalBytes === Number(job.package_size_bytes) ? "Stored package size matches backup job metadata." : "Stored package size does not match backup job metadata."
    );
  } else {
    addCheck(checks, "not_verified", "Package size", "Backup job metadata does not include package size to compare.");
  }

  return { totalBytes, packageSha256Verified };
}

function compareManifestEvidence(job: BackupJobForStoredVerification, archiveManifest: BackupManifest, checks: StoredBackupVerificationCheck[], errors: string[], warnings: string[]) {
  const expectedManifest = job.manifest;

  addCheck(
    checks,
    archiveManifest.backup_id === job.id ? "passed" : "failed",
    "Manifest backup ID",
    archiveManifest.backup_id === job.id ? "Archive manifest backup ID matches the requested backup job." : "Archive manifest backup ID does not match the requested backup job."
  );

  if (archiveManifest.backup_id !== job.id) errors.push("Archive manifest backup ID does not match the requested backup job.");

  addCheck(
    checks,
    archiveManifest.backup_version === backupVersion && job.backup_version === backupVersion ? "passed" : "failed",
    "Backup version",
    archiveManifest.backup_version === backupVersion && job.backup_version === backupVersion ? `Backup version ${backupVersion} is consistent.` : `Backup version is inconsistent. Expected ${backupVersion}.`
  );

  if (archiveManifest.backup_version !== backupVersion || job.backup_version !== backupVersion) errors.push("Backup version is incompatible or inconsistent.");

  const requiredTableCount = countRequiredTables(archiveManifest);
  const requiredBucketCount = countRequiredBuckets(archiveManifest);

  addCheck(
    checks,
    requiredTableCount === requiredTables.length ? "passed" : "failed",
    "Required table exports",
    `${requiredTableCount}/${requiredTables.length} required public table export(s) are present in the actual archive manifest.`
  );

  addCheck(
    checks,
    requiredBucketCount === requiredBuckets.length ? "passed" : "failed",
    "Required bucket exports",
    `${requiredBucketCount}/${requiredBuckets.length} required Storage bucket export(s) are present in the actual archive manifest.`
  );

  if (requiredTableCount !== requiredTables.length) errors.push("Actual archive manifest is missing one or more required table exports.");
  if (requiredBucketCount !== requiredBuckets.length) errors.push("Actual archive manifest is missing one or more required bucket exports.");

  if (!expectedManifest) {
    warnings.push("Backup job metadata does not include a stored manifest to compare against the actual archive manifest.");
    addCheck(checks, "not_verified", "Job manifest comparison", "Backup job manifest metadata is unavailable.");
    return;
  }

  addCheck(
    checks,
    sumRecords(expectedManifest) === sumRecords(archiveManifest) ? "passed" : "failed",
    "Record count metadata",
    sumRecords(expectedManifest) === sumRecords(archiveManifest) ? "Archive record totals match backup job manifest metadata." : "Archive record totals differ from backup job manifest metadata."
  );

  addCheck(
    checks,
    sumFiles(expectedManifest) === sumFiles(archiveManifest) ? "passed" : "failed",
    "Storage file count metadata",
    sumFiles(expectedManifest) === sumFiles(archiveManifest) ? "Archive Storage file totals match backup job manifest metadata." : "Archive Storage file totals differ from backup job manifest metadata."
  );

  if (sumRecords(expectedManifest) !== sumRecords(archiveManifest)) errors.push("Archive record totals differ from backup job manifest metadata.");
  if (sumFiles(expectedManifest) !== sumFiles(archiveManifest)) errors.push("Archive Storage file totals differ from backup job manifest metadata.");
}

export async function verifyStoredBackupPackage(admin: SupabaseClient, backupId: string): Promise<StoredBackupVerificationReport> {
  const checks: StoredBackupVerificationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isUuid(backupId)) {
    addCheck(checks, "blocked", "Backup identifier", "Backup ID must be a valid UUID.");
    return buildReport({ status: "BLOCKED", backupId, checks, errors: ["Backup ID is invalid."] });
  }

  const job = await getBackupJob(admin, backupId);
  if (!job) {
    addCheck(checks, "blocked", "Backup job", "No backup job was found for the requested backup ID.");
    return buildReport({ status: "BLOCKED", backupId, checks, errors: ["Backup job was not found."] });
  }

  addCheck(checks, "passed", "Backup identifier", "Backup ID was resolved through backup_jobs metadata.");

  if (job.status !== "completed") {
    addCheck(checks, "blocked", "Backup status", `Backup job status is ${job.status || "unknown"}, not completed.`);
    return buildReport({ status: "INCOMPLETE", backupId, job, checks, errors: [`Backup job status is ${job.status || "unknown"}, not completed.`] });
  }

  if (!job.package_path || !job.package_size_bytes || !job.package_sha256) {
    addCheck(checks, "blocked", "Package metadata", "Package path, package size, or package SHA-256 is missing from backup job metadata.");
    return buildReport({ status: "INCOMPLETE", backupId, job, checks, errors: ["Backup package metadata is incomplete."] });
  }

  if (!isSafeBackupStoragePath(job.id, job.package_path)) {
    addCheck(checks, "blocked", "Package path safety", "Package Storage path is unsafe or does not belong to the requested backup ID.");
    return buildReport({ status: "BLOCKED", backupId, job, checks, errors: ["Backup package path is unsafe."] });
  }

  if (Number(job.package_size_bytes) > maxStoredPackageVerificationBytes) {
    addCheck(checks, "blocked", "Package size limit", "Stored package exceeds the 1 GB verification limit.");
    return buildReport({ status: "BLOCKED", backupId, job, checks, errors: ["Stored package is too large to verify safely."] });
  }

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `royalty-stamp-stored-verify-${backupId}-`));
  const packageFileName = getStoredPackageFileName(job.package_path);
  const packagePath = path.join(tempDir, packageFileName);
  const extractDir = path.join(tempDir, "extract");

  try {
    const reconstructed = await reconstructStoredPackage(admin, job, packagePath, checks);

    if (!reconstructed.packageSha256Verified) {
      errors.push("Stored package SHA-256 could not be verified against backup job metadata.");
    }

    if (reconstructed.totalBytes !== Number(job.package_size_bytes)) {
      errors.push("Stored package size does not match backup job metadata.");
    }

    const validation = await validateBackupArchive(packagePath, packageFileName, reconstructed.totalBytes);
    addCheck(
      checks,
      validation.valid ? "passed" : "failed",
      "Archive validation",
      validation.valid ? "Existing backup archive validation rules passed against the actual stored package bytes." : "Existing backup archive validation rules failed against the actual stored package bytes."
    );

    if (!validation.valid) {
      return buildReport({
        status: "INVALID",
        backupId,
        archiveRetrieved: true,
        job,
        validation,
        packageSizeBytesRetrieved: reconstructed.totalBytes,
        packageSha256Verified: reconstructed.packageSha256Verified,
        checks,
        errors: [...errors, ...validation.errors],
        warnings: [...warnings, ...validation.warnings],
      });
    }

    const archive = await extractBackupArchive(packagePath, extractDir);
    compareManifestEvidence(job, archive.manifest, checks, errors, warnings);

    const failedChecks = checks.filter((check) => check.status === "failed" || check.status === "blocked");
    const notVerifiedChecks = checks.filter((check) => check.status === "not_verified");
    const status: StoredBackupVerificationStatus = failedChecks.length > 0 || errors.length > 0
      ? "INVALID"
      : notVerifiedChecks.length > 0
        ? "NOT_VERIFIED"
        : "VALIDATED";

    return buildReport({
      status,
      backupId,
      archiveRetrieved: true,
      job,
      validation,
      packageSizeBytesRetrieved: reconstructed.totalBytes,
      packageSha256Verified: reconstructed.packageSha256Verified,
      manifest: archive.manifest,
      checks,
      errors,
      warnings: [...warnings, ...validation.warnings],
    });
  } catch (error: any) {
    addCheck(checks, "not_verified", "Stored archive retrieval", "The stored package could not be fully retrieved, reconstructed, or validated.");
    return buildReport({
      status: "NOT_VERIFIED",
      backupId,
      archiveRetrieved: false,
      job,
      checks,
      errors: [error.message || "Stored backup package verification failed."],
      warnings,
    });
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}