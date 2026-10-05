import crypto from "crypto";
import fs from "fs";
import zlib from "zlib";
import { backupVersion, requiredBuckets, requiredTables, type BackupManifest } from "@/lib/server/backupConfig";

type EntryInfo = {
  path: string;
  size: number;
  sha256: string;
  newlineCount: number;
};

export type BackupValidationCheck = {
  name: string;
  status: "passed" | "failed" | "warning";
  details: string;
};

export type BackupValidationReport = {
  valid: boolean;
  file_name: string;
  file_size_bytes: number;
  backup_id?: string;
  backup_version?: string;
  created_at?: string;
  table_count: number;
  bucket_count: number;
  total_records: number;
  total_files: number;
  database_size_bytes: number;
  storage_size_bytes: number;
  checks: BackupValidationCheck[];
  errors: string[];
  warnings: string[];
};

function parseTarString(buffer: Buffer, start: number, length: number) {
  return buffer.subarray(start, start + length).toString("utf8").replace(/\0.*$/, "").trim();
}

function parseTarOctal(buffer: Buffer, start: number, length: number) {
  const value = parseTarString(buffer, start, length).replace(/\0/g, "").trim();
  return value ? Number.parseInt(value, 8) : 0;
}

function isZeroBlock(buffer: Buffer) {
  return buffer.every((byte) => byte === 0);
}

function isSafeArchivePath(archivePath: string) {
  if (!archivePath || archivePath.startsWith("/") || archivePath.includes("\\") || /^[a-zA-Z]:/.test(archivePath)) return false;
  return archivePath.split("/").every((part) => part !== ".." && part !== "");
}

function countNewlines(buffer: Buffer) {
  let count = 0;
  for (const byte of buffer) {
    if (byte === 10) count += 1;
  }
  return count;
}

function addCheck(checks: BackupValidationCheck[], name: string, ok: boolean, details: string) {
  checks.push({ name, status: ok ? "passed" : "failed", details });
}

function addWarning(checks: BackupValidationCheck[], warnings: string[], name: string, details: string) {
  checks.push({ name, status: "warning", details });
  warnings.push(details);
}

async function readArchiveEntries(filePath: string) {
  const stream = fs.createReadStream(filePath).pipe(zlib.createGunzip());
  const iterator = stream[Symbol.asyncIterator]();
  let buffer = Buffer.alloc(0);
  const entries = new Map<string, EntryInfo>();
  let manifestBuffer: Buffer | null = null;
  const unsafePaths: string[] = [];

  const pull = async () => {
    const next = await iterator.next();
    if (next.done) return false;
    const chunk = Buffer.isBuffer(next.value) ? next.value : Buffer.from(next.value);
    buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);
    return true;
  };

  const fill = async (size: number) => {
    while (buffer.length < size) {
      const hasMore = await pull();
      if (!hasMore) throw new Error("Archive ended unexpectedly");
    }
  };

  const skipBytes = async (size: number) => {
    let remaining = size;
    while (remaining > 0) {
      if (buffer.length === 0) {
        const hasMore = await pull();
        if (!hasMore) throw new Error("Archive ended unexpectedly while skipping padding");
      }

      const take = Math.min(remaining, buffer.length);
      buffer = buffer.subarray(take);
      remaining -= take;
    }
  };

  const consumeEntry = async (entryPath: string, size: number) => {
    const hash = crypto.createHash("sha256");
    const manifestChunks: Buffer[] = [];
    let remaining = size;
    let newlineCount = 0;
    let capturedBytes = 0;
    const captureManifest = entryPath === "manifest.json";

    while (remaining > 0) {
      if (buffer.length === 0) {
        const hasMore = await pull();
        if (!hasMore) throw new Error(`Archive ended unexpectedly while reading ${entryPath}`);
      }

      const take = Math.min(remaining, buffer.length);
      const chunk = buffer.subarray(0, take);
      hash.update(chunk);
      newlineCount += countNewlines(chunk);

      if (captureManifest) {
        capturedBytes += chunk.length;
        if (capturedBytes > 25 * 1024 * 1024) {
          throw new Error("Manifest is too large to validate safely");
        }
        manifestChunks.push(Buffer.from(chunk));
      }

      buffer = buffer.subarray(take);
      remaining -= take;
    }

    const padding = (512 - (size % 512)) % 512;
    if (padding > 0) await skipBytes(padding);

    const entry = {
      path: entryPath,
      size,
      sha256: hash.digest("hex"),
      newlineCount,
    };

    if (captureManifest) manifestBuffer = Buffer.concat(manifestChunks);
    return entry;
  };

  while (true) {
    await fill(512);
    const header = buffer.subarray(0, 512);
    buffer = buffer.subarray(512);

    if (isZeroBlock(header)) break;

    const name = parseTarString(header, 0, 100);
    const prefix = parseTarString(header, 345, 155);
    const entryPath = prefix ? `${prefix}/${name}` : name;
    const size = parseTarOctal(header, 124, 12);
    const typeFlag = parseTarString(header, 156, 1) || "0";

    if (!isSafeArchivePath(entryPath)) unsafePaths.push(entryPath);

    if (typeFlag !== "0") {
      await skipBytes(size + ((512 - (size % 512)) % 512));
      continue;
    }

    const entry = await consumeEntry(entryPath, size);
    entries.set(entryPath, entry);
  }

  return { entries, manifestBuffer, unsafePaths };
}

function parseManifest(manifestBuffer: Buffer | null) {
  if (!manifestBuffer) throw new Error("manifest.json is missing from the backup archive");

  try {
    return JSON.parse(manifestBuffer.toString("utf8")) as BackupManifest;
  } catch {
    throw new Error("manifest.json is not valid JSON");
  }
}

function isRoyaltyStampBackupFileName(fileName: string) {
  return decodeURIComponent(fileName || "").trim().toLowerCase().includes(".tar.gz");
}

export async function validateBackupArchive(filePath: string, fileName: string, fileSizeBytes: number): Promise<BackupValidationReport> {
  const checks: BackupValidationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!isRoyaltyStampBackupFileName(fileName)) {
      errors.push("Backup file name must identify a .tar.gz archive.");
    }

    addCheck(checks, "File type", isRoyaltyStampBackupFileName(fileName), isRoyaltyStampBackupFileName(fileName) ? "Archive file name identifies a .tar.gz backup." : "Only Royalty Stamp .tar.gz backup archives are accepted.");

    const { entries, manifestBuffer, unsafePaths } = await readArchiveEntries(filePath);
    const manifest = parseManifest(manifestBuffer);

    addCheck(checks, "Path safety", unsafePaths.length === 0, unsafePaths.length === 0 ? "No unsafe archive paths detected." : `Unsafe archive paths: ${unsafePaths.join(", ")}`);
    if (unsafePaths.length > 0) errors.push("Archive contains unsafe paths and was rejected.");

    addCheck(checks, "Application identity", manifest.app === "aruba-royalty-stamp", manifest.app === "aruba-royalty-stamp" ? "Manifest belongs to Aruba Royalty Stamp." : "Manifest app identity is incompatible.");
    if (manifest.app !== "aruba-royalty-stamp") errors.push("Backup app identity is incompatible.");

    addCheck(checks, "Backup version", manifest.backup_version === backupVersion, manifest.backup_version === backupVersion ? `Backup version ${manifest.backup_version} is compatible.` : `Expected ${backupVersion}, received ${manifest.backup_version || "unknown"}.`);
    if (manifest.backup_version !== backupVersion) errors.push("Backup version is incompatible.");

    addCheck(checks, "Package format", manifest.package_format === "tar.gz", manifest.package_format === "tar.gz" ? "Package format is tar.gz." : "Package format is not tar.gz.");
    if (manifest.package_format !== "tar.gz") errors.push("Backup package format is incompatible.");

    const manifestEntry = entries.get("manifest.json");
    addCheck(checks, "Manifest presence", Boolean(manifestEntry), "manifest.json is present and readable.");

    const tableMap = new Map((manifest.tables || []).map((table) => [table.table, table]));
    const missingTables = requiredTables.filter((table) => !tableMap.has(table));
    addCheck(checks, "Required database exports", missingTables.length === 0, missingTables.length === 0 ? `${requiredTables.length} required tables are listed.` : `Missing tables: ${missingTables.join(", ")}`);
    if (missingTables.length > 0) errors.push("One or more required database exports are missing.");

    for (const table of manifest.tables || []) {
      const entry = entries.get(table.path);
      if (!entry) {
        errors.push(`Database export missing from archive: ${table.path}`);
        continue;
      }
      if (entry.sha256 !== table.sha256 || entry.size !== table.bytes) {
        errors.push(`Database export checksum or size mismatch: ${table.path}`);
      }
      if (entry.newlineCount !== table.record_count) {
        errors.push(`Database export record count mismatch for ${table.table}.`);
      }
    }

    const bucketMap = new Map((manifest.buckets || []).map((bucket) => [bucket.bucket, bucket]));
    const missingBuckets = requiredBuckets.filter((bucket) => !bucketMap.has(bucket));
    addCheck(checks, "Required Storage exports", missingBuckets.length === 0, missingBuckets.length === 0 ? `${requiredBuckets.length} required buckets are listed.` : `Missing buckets: ${missingBuckets.join(", ")}`);
    if (missingBuckets.length > 0) errors.push("One or more required Storage exports are missing.");

    for (const bucket of manifest.buckets || []) {
      for (const object of bucket.objects || []) {
        const entry = entries.get(object.archive_path);
        if (!entry) {
          errors.push(`Storage file missing from archive: ${object.archive_path}`);
          continue;
        }
        if (entry.sha256 !== object.sha256 || entry.size !== object.bytes) {
          errors.push(`Storage file checksum or size mismatch: ${object.archive_path}`);
        }
      }
    }

    for (const file of manifest.file_list || []) {
      const entry = entries.get(file.path);
      if (!entry) {
        errors.push(`Manifest file_list entry missing from archive: ${file.path}`);
        continue;
      }
      if (entry.sha256 !== file.sha256 || entry.size !== file.size) {
        errors.push(`Manifest file_list checksum or size mismatch: ${file.path}`);
      }
    }

    for (const [entryPath, expectedSha] of Object.entries(manifest.sha256_checksums || {})) {
      const entry = entries.get(entryPath);
      if (!entry) {
        errors.push(`Checksum entry missing from archive: ${entryPath}`);
        continue;
      }
      if (entry.sha256 !== expectedSha) {
        errors.push(`Checksum mismatch for ${entryPath}`);
      }
    }

    if (!manifest.sha256_checksums?.["manifest.json"]) {
      addWarning(checks, warnings, "Manifest self-checksum", "Archive manifest does not include its own checksum; this is expected for earlier Phase 2 backups and does not block validation.");
    }

    const checksumErrorCount = errors.filter((error) => error.toLowerCase().includes("checksum") || error.toLowerCase().includes("missing from archive") || error.toLowerCase().includes("record count")).length;
    addCheck(checks, "Integrity checksums", checksumErrorCount === 0, checksumErrorCount === 0 ? "All listed file checksums, sizes, and record counts match." : `${checksumErrorCount} integrity issue(s) detected.`);

    return {
      valid: errors.length === 0,
      file_name: fileName,
      file_size_bytes: fileSizeBytes,
      backup_id: manifest.backup_id,
      backup_version: manifest.backup_version,
      created_at: manifest.created_at,
      table_count: manifest.tables?.length || 0,
      bucket_count: manifest.buckets?.length || 0,
      total_records: Object.values(manifest.row_counts || {}).reduce((sum, count) => sum + Number(count || 0), 0),
      total_files: (manifest.buckets || []).reduce((sum, bucket) => sum + Number(bucket.object_count || 0), 0),
      database_size_bytes: manifest.total_database_bytes || 0,
      storage_size_bytes: manifest.total_storage_bytes || 0,
      checks,
      errors,
      warnings,
    };
  } catch (error: any) {
    errors.push(error.message || "Backup validation failed.");

    return {
      valid: false,
      file_name: fileName,
      file_size_bytes: fileSizeBytes,
      table_count: 0,
      bucket_count: 0,
      total_records: 0,
      total_files: 0,
      database_size_bytes: 0,
      storage_size_bytes: 0,
      checks,
      errors,
      warnings,
    };
  }
}