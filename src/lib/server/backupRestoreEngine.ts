import fs from "fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { backupVersion, requiredBuckets, requiredTables, type BackupManifest } from "@/lib/server/backupConfig";
import { createBackupPackage } from "@/lib/server/backupEngine";
import { extractBackupArchive, type ExtractedBackupArchive } from "@/lib/server/backupRestoreArchive";
import { validateBackupArchive, type BackupValidationReport } from "@/lib/server/backupValidator";

export type RestoreMode = "dry_run" | "restore";

export type RestoreTableResult = {
  table: string;
  records_seen: number;
  records_restored: number;
};

export type RestoreStorageResult = {
  bucket: string;
  files_seen: number;
  files_restored: number;
  bytes_restored: number;
};

export type BackupRestoreReport = {
  valid: boolean;
  restore_mode: RestoreMode;
  restore_job_id: string;
  backup_id?: string;
  backup_version?: string;
  safety_backup_job_id?: string | null;
  validation: BackupValidationReport;
  table_results: RestoreTableResult[];
  storage_results: RestoreStorageResult[];
  restored_records: number;
  restored_files: number;
  restored_storage_bytes: number;
  errors: string[];
  warnings: string[];
};

const restoreConfirmationPhrase = "RESTORE ROYALTY STAMP BACKUP";

const primaryKeyByTable: Record<string, string> = {
  website_pages: "slug",
  website_settings: "key",
  reward_qr_tokens: "token",
};

function getPrimaryKey(table: string) {
  return primaryKeyByTable[table] || "id";
}

function getRestoreOrder(manifest: BackupManifest) {
  const manifestTables = new Set((manifest.tables || []).map((table) => table.table));
  return requiredTables.filter((table) => manifestTables.has(table));
}

async function createRestoreJob(admin: SupabaseClient, performedBy: string, mode: RestoreMode) {
  const { data, error } = await (admin as any)
    .from("restore_jobs")
    .insert({
      status: "running",
      restore_mode: mode,
      performed_by: performedBy,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function updateRestoreJob(admin: SupabaseClient, jobId: string, payload: Record<string, unknown>) {
  const { error } = await (admin as any)
    .from("restore_jobs")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) throw error;
}

async function readJsonlRows(filePath: string) {
  const content = await fs.promises.readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

async function restoreTable(admin: SupabaseClient, archive: ExtractedBackupArchive, table: string): Promise<RestoreTableResult> {
  const tableManifest = archive.manifest.tables.find((item) => item.table === table);
  if (!tableManifest) return { table, records_seen: 0, records_restored: 0 };

  const entry = archive.entries.get(tableManifest.path);
  if (!entry) throw new Error(`Database export not found after validation: ${tableManifest.path}`);

  const rows = await readJsonlRows(entry.filePath);
  const primaryKey = getPrimaryKey(table);
  let restored = 0;

  for (let index = 0; index < rows.length; index += 100) {
    const batch = rows.slice(index, index + 100);
    if (batch.length === 0) continue;

    const { error } = await (admin as any)
      .from(table)
      .upsert(batch, { onConflict: primaryKey });

    if (error) throw new Error(`Failed restoring table ${table}: ${error.message}`);
    restored += batch.length;
  }

  return {
    table,
    records_seen: rows.length,
    records_restored: restored,
  };
}

async function restoreStorage(admin: SupabaseClient, archive: ExtractedBackupArchive) {
  const results: RestoreStorageResult[] = [];

  for (const bucketManifest of archive.manifest.buckets || []) {
    if (!requiredBuckets.includes(bucketManifest.bucket)) continue;

    let filesRestored = 0;
    let bytesRestored = 0;

    for (const object of bucketManifest.objects || []) {
      const entry = archive.entries.get(object.archive_path);
      if (!entry) throw new Error(`Storage object not found after validation: ${object.archive_path}`);

      const { error } = await admin.storage
        .from(bucketManifest.bucket)
        .upload(object.object_path, fs.createReadStream(entry.filePath) as any, {
          contentType: object.content_type || "application/octet-stream",
          upsert: true,
        });

      if (error) throw new Error(`Failed restoring Storage file ${bucketManifest.bucket}/${object.object_path}: ${error.message}`);

      filesRestored += 1;
      bytesRestored += object.bytes;
    }

    results.push({
      bucket: bucketManifest.bucket,
      files_seen: bucketManifest.objects?.length || 0,
      files_restored: filesRestored,
      bytes_restored: bytesRestored,
    });
  }

  return results;
}

function buildDryRunReport(restoreJobId: string, mode: RestoreMode, validation: BackupValidationReport, archive: ExtractedBackupArchive): BackupRestoreReport {
  const tableResults = getRestoreOrder(archive.manifest).map((table) => {
    const manifestTable = archive.manifest.tables.find((item) => item.table === table);
    return {
      table,
      records_seen: manifestTable?.record_count || 0,
      records_restored: 0,
    };
  });

  const storageResults = (archive.manifest.buckets || [])
    .filter((bucket) => requiredBuckets.includes(bucket.bucket))
    .map((bucket) => ({
      bucket: bucket.bucket,
      files_seen: bucket.object_count || 0,
      files_restored: 0,
      bytes_restored: 0,
    }));

  return {
    valid: true,
    restore_mode: mode,
    restore_job_id: restoreJobId,
    backup_id: archive.manifest.backup_id,
    backup_version: archive.manifest.backup_version,
    validation,
    table_results: tableResults,
    storage_results: storageResults,
    restored_records: 0,
    restored_files: 0,
    restored_storage_bytes: 0,
    errors: [],
    warnings: validation.warnings,
  };
}

export async function restoreBackupPackage(params: {
  admin: SupabaseClient;
  adminUserId: string;
  uploadedPackagePath: string;
  fileName: string;
  fileSizeBytes: number;
  confirmation: string;
  mode: RestoreMode;
  tempDir: string;
}): Promise<BackupRestoreReport> {
  const { admin, adminUserId, uploadedPackagePath, fileName, fileSizeBytes, confirmation, mode, tempDir } = params;
  const restoreJobId = await createRestoreJob(admin, adminUserId, mode);

  try {
    if (confirmation !== restoreConfirmationPhrase) {
      throw new Error(`Restore requires exact confirmation phrase: ${restoreConfirmationPhrase}`);
    }

    const validation = await validateBackupArchive(uploadedPackagePath, fileName, fileSizeBytes);
    if (!validation.valid) {
      const report: BackupRestoreReport = {
        valid: false,
        restore_mode: mode,
        restore_job_id: restoreJobId,
        backup_id: validation.backup_id,
        backup_version: validation.backup_version,
        validation,
        table_results: [],
        storage_results: [],
        restored_records: 0,
        restored_files: 0,
        restored_storage_bytes: 0,
        errors: validation.errors,
        warnings: validation.warnings,
      };

      await updateRestoreJob(admin, restoreJobId, {
        status: "failed",
        backup_id: validation.backup_id || null,
        backup_version: validation.backup_version || null,
        report,
        error_message: "Backup validation failed before restore.",
        completed_at: new Date().toISOString(),
      });

      return report;
    }

    const archive = await extractBackupArchive(uploadedPackagePath, tempDir);
    if (archive.manifest.backup_version !== backupVersion) {
      throw new Error("Backup version changed between validation and restore extraction.");
    }

    if (mode === "dry_run") {
      const dryRunReport = buildDryRunReport(restoreJobId, mode, validation, archive);
      await updateRestoreJob(admin, restoreJobId, {
        status: "completed",
        backup_id: archive.manifest.backup_id,
        backup_version: archive.manifest.backup_version,
        manifest: archive.manifest,
        report: dryRunReport,
        completed_at: new Date().toISOString(),
      });

      await admin.from("audit_logs").insert({
        admin_user_id: adminUserId,
        action: "dry_run_backup_restore",
        target_type: "restore_job",
        target_id: restoreJobId,
        metadata: {
          backup_id: archive.manifest.backup_id,
          backup_version: archive.manifest.backup_version,
          validation_valid: validation.valid,
          tables: archive.manifest.tables.length,
          buckets: archive.manifest.buckets.length,
        },
      });

      return dryRunReport;
    }

    const safetyBackup = await createBackupPackage(admin, adminUserId);
    const storageResults = await restoreStorage(admin, archive);
    const tableResults: RestoreTableResult[] = [];

    for (const table of getRestoreOrder(archive.manifest)) {
      tableResults.push(await restoreTable(admin, archive, table));
    }

    const report: BackupRestoreReport = {
      valid: true,
      restore_mode: mode,
      restore_job_id: restoreJobId,
      backup_id: archive.manifest.backup_id,
      backup_version: archive.manifest.backup_version,
      safety_backup_job_id: safetyBackup.backupId,
      validation,
      table_results: tableResults,
      storage_results: storageResults,
      restored_records: tableResults.reduce((sum, item) => sum + item.records_restored, 0),
      restored_files: storageResults.reduce((sum, item) => sum + item.files_restored, 0),
      restored_storage_bytes: storageResults.reduce((sum, item) => sum + item.bytes_restored, 0),
      errors: [],
      warnings: validation.warnings,
    };

    await updateRestoreJob(admin, restoreJobId, {
      status: "completed",
      backup_id: archive.manifest.backup_id,
      backup_version: archive.manifest.backup_version,
      safety_backup_job_id: safetyBackup.backupId,
      manifest: archive.manifest,
      report,
      completed_at: new Date().toISOString(),
    });

    await admin.from("audit_logs").insert({
      admin_user_id: adminUserId,
      action: "restore_backup_package",
      target_type: "restore_job",
      target_id: restoreJobId,
      metadata: {
        backup_id: archive.manifest.backup_id,
        backup_version: archive.manifest.backup_version,
        safety_backup_job_id: safetyBackup.backupId,
        restored_records: report.restored_records,
        restored_files: report.restored_files,
        restored_storage_bytes: report.restored_storage_bytes,
      },
    });

    return report;
  } catch (error: any) {
    const message = error.message || "Backup restore failed";
    await updateRestoreJob(admin, restoreJobId, {
      status: "failed",
      error_message: message,
      report: {
        valid: false,
        restore_mode: mode,
        restore_job_id: restoreJobId,
        errors: [message],
      },
      completed_at: new Date().toISOString(),
    });

    await admin.from("audit_logs").insert({
      admin_user_id: adminUserId,
      action: "restore_backup_package_failed",
      target_type: "restore_job",
      target_id: restoreJobId,
      metadata: {
        error: message,
        restore_mode: mode,
      },
    });

    throw error;
  }
}