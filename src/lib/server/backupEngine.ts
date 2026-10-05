import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { once } from "events";
import { pipeline } from "stream/promises";
import zlib from "zlib";
import type { SupabaseClient } from "@supabase/supabase-js";

type BackupFileEntry = {
  path: string;
  size: number;
  sha256: string;
  source_type: "database" | "storage" | "metadata";
  source_name: string;
};

type TableManifest = {
  table: string;
  path: string;
  record_count: number;
  bytes: number;
  sha256: string;
};

type StorageObjectManifest = {
  bucket: string;
  object_path: string;
  archive_path: string;
  bytes: number;
  sha256: string;
  content_type?: string;
  updated_at?: string;
};

type BackupManifest = {
  app: "aruba-royalty-stamp";
  backup_version: string;
  backup_id: string;
  created_at: string;
  created_by: string;
  backup_mode: "full";
  package_format: "tar.gz";
  tables: TableManifest[];
  buckets: Array<{
    bucket: string;
    object_count: number;
    total_bytes: number;
    objects: StorageObjectManifest[];
  }>;
  row_counts: Record<string, number>;
  object_counts: Record<string, number>;
  total_database_bytes: number;
  total_storage_bytes: number;
  file_list: BackupFileEntry[];
  sha256_checksums: Record<string, string>;
  auth_notice: string;
};

const requiredTables = [
  "subscription_plans",
  "plan_entitlements",
  "subscription_addons",
  "platform_bank_accounts",
  "website_pages",
  "website_settings",
  "profiles",
  "customers",
  "businesses",
  "business_users",
  "loyalty_programs",
  "customer_loyalty_cards",
  "stamp_transactions",
  "rewards",
  "qr_codes",
  "quick_stamp_qr_tokens",
  "reward_qr_tokens",
  "subscription_payments",
  "business_addon_subscriptions",
  "payment_transactions",
  "email_logs",
  "contract_reminders",
  "audit_logs",
  "super_admin_notification_reads",
  "api_rate_limits",
];

const requiredBuckets = ["loyalty-assets", "payment-proofs"];
const backupVersion = "2026-10-05.phase2";
const tablePageSize = 1000;

function safeArchivePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.\./g, "_");
}

function sha256Buffer(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function writeChunk(stream: NodeJS.WritableStream, chunk: Buffer) {
  if (!stream.write(chunk)) {
    await once(stream, "drain");
  }
}

function writeTarString(header: Buffer, value: string, offset: number, length: number) {
  header.write(value.slice(0, length), offset, length, "utf8");
}

function writeTarOctal(header: Buffer, value: number, offset: number, length: number) {
  const octal = value.toString(8).padStart(length - 1, "0").slice(0, length - 1);
  header.write(octal + "\0", offset, length, "ascii");
}

function splitTarName(name: string) {
  if (Buffer.byteLength(name) <= 100) {
    return { name, prefix: "" };
  }

  const parts = name.split("/");
  let fileName = parts.pop() || "";
  let prefix = parts.join("/");

  while (Buffer.byteLength(fileName) > 100 && prefix) {
    fileName = `${prefix.split("/").pop()}/${fileName}`;
    prefix = prefix.split("/").slice(0, -1).join("/");
  }

  if (Buffer.byteLength(fileName) > 100 || Buffer.byteLength(prefix) > 155) {
    const digest = crypto.createHash("sha1").update(name).digest("hex");
    fileName = `${digest}-${path.basename(name)}`.slice(0, 100);
    prefix = path.dirname(name).slice(0, 155);
  }

  return { name: fileName, prefix };
}

function createTarHeader(filePath: string, size: number) {
  const header = Buffer.alloc(512, 0);
  const split = splitTarName(safeArchivePath(filePath));
  writeTarString(header, split.name, 0, 100);
  writeTarOctal(header, 0o644, 100, 8);
  writeTarOctal(header, 0, 108, 8);
  writeTarOctal(header, 0, 116, 8);
  writeTarOctal(header, size, 124, 12);
  writeTarOctal(header, Math.floor(Date.now() / 1000), 136, 12);
  header.fill(" ", 148, 156);
  writeTarString(header, "0", 156, 1);
  writeTarString(header, "ustar", 257, 6);
  writeTarString(header, "00", 263, 2);
  writeTarString(header, split.prefix, 345, 155);

  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeTarOctal(header, checksum, 148, 8);
  return header;
}

async function addBufferToTar(gzip: zlib.Gzip, filePath: string, buffer: Buffer) {
  await writeChunk(gzip, createTarHeader(filePath, buffer.length));
  await writeChunk(gzip, buffer);

  const padding = (512 - (buffer.length % 512)) % 512;
  if (padding > 0) {
    await writeChunk(gzip, Buffer.alloc(padding));
  }
}

async function exportTable(admin: SupabaseClient, table: string, tempDir: string) {
  const filePath = path.join(tempDir, `${table}.jsonl`);
  const stream = fs.createWriteStream(filePath);
  const hash = crypto.createHash("sha256");
  let recordCount = 0;
  let bytes = 0;
  let offset = 0;

  try {
    while (true) {
      const { data, error } = await (admin as any)
        .from(table)
        .select("*")
        .range(offset, offset + tablePageSize - 1);

      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];

      for (const row of rows) {
        const line = Buffer.from(`${JSON.stringify(row)}\n`);
        hash.update(line);
        bytes += line.length;
        recordCount += 1;
        await writeChunk(stream, line);
      }

      if (rows.length < tablePageSize) break;
      offset += tablePageSize;
    }
  } finally {
    stream.end();
    await once(stream, "finish");
  }

  return {
    table,
    archivePath: `data/${table}.jsonl`,
    tempPath: filePath,
    recordCount,
    bytes,
    sha256: hash.digest("hex"),
  };
}

async function listBucketObjects(admin: SupabaseClient, bucket: string, prefix = ""): Promise<string[]> {
  const objectPaths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;
    const entries = data || [];

    for (const entry of entries) {
      const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFolder = !entry.id && !entry.metadata;

      if (isFolder) {
        objectPaths.push(...await listBucketObjects(admin, bucket, objectPath));
      } else {
        objectPaths.push(objectPath);
      }
    }

    if (entries.length < 1000) break;
    offset += 1000;
  }

  return objectPaths;
}

async function downloadStorageObject(admin: SupabaseClient, bucket: string, objectPath: string) {
  const { data, error } = await admin.storage.from(bucket).download(objectPath);
  if (error) throw error;
  const buffer = Buffer.from(await data.arrayBuffer());
  const contentType = data.type || undefined;

  return {
    buffer,
    manifest: {
      bucket,
      object_path: objectPath,
      archive_path: `storage/${bucket}/${safeArchivePath(objectPath)}`,
      bytes: buffer.length,
      sha256: sha256Buffer(buffer),
      content_type: contentType,
    },
  };
}

async function updateJob(admin: SupabaseClient, jobId: string, payload: Record<string, unknown>) {
  const { error } = await (admin as any)
    .from("backup_jobs")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) throw error;
}

export async function createBackupPackage(admin: SupabaseClient, createdBy: string) {
  const startedAt = new Date().toISOString();
  const { data: job, error: jobError } = await (admin as any)
    .from("backup_jobs")
    .insert({
      status: "running",
      backup_version: backupVersion,
      created_by: createdBy,
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (jobError) throw jobError;

  const backupId = job.id as string;
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `royalty-stamp-backup-${backupId}-`));
  const packageName = `royalty-stamp-backup-${startedAt.replace(/[:.]/g, "-")}-${backupId}.tar.gz`;
  const packagePath = path.join(tempDir, packageName);
  const gzip = zlib.createGzip({ level: 9 });
  const output = fs.createWriteStream(packagePath);
  const packageHash = crypto.createHash("sha256");
  gzip.on("data", (chunk: Buffer) => packageHash.update(chunk));
  const gzipPipeline = pipeline(gzip, output);

  const fileList: BackupFileEntry[] = [];
  const tableManifests: TableManifest[] = [];
  const bucketManifests: BackupManifest["buckets"] = [];
  const checksums: Record<string, string> = {};
  let totalDatabaseBytes = 0;
  let totalStorageBytes = 0;

  try {
    for (const table of requiredTables) {
      const exported = await exportTable(admin, table, tempDir);
      const buffer = await fs.promises.readFile(exported.tempPath);
      await addBufferToTar(gzip, exported.archivePath, buffer);
      totalDatabaseBytes += exported.bytes;
      checksums[exported.archivePath] = exported.sha256;
      tableManifests.push({
        table,
        path: exported.archivePath,
        record_count: exported.recordCount,
        bytes: exported.bytes,
        sha256: exported.sha256,
      });
      fileList.push({
        path: exported.archivePath,
        size: exported.bytes,
        sha256: exported.sha256,
        source_type: "database",
        source_name: table,
      });
    }

    for (const bucket of requiredBuckets) {
      const objects = await listBucketObjects(admin, bucket);
      const objectManifests: StorageObjectManifest[] = [];

      for (const objectPath of objects) {
        const downloaded = await downloadStorageObject(admin, bucket, objectPath);
        await addBufferToTar(gzip, downloaded.manifest.archive_path, downloaded.buffer);
        totalStorageBytes += downloaded.manifest.bytes;
        checksums[downloaded.manifest.archive_path] = downloaded.manifest.sha256;
        objectManifests.push(downloaded.manifest);
        fileList.push({
          path: downloaded.manifest.archive_path,
          size: downloaded.manifest.bytes,
          sha256: downloaded.manifest.sha256,
          source_type: "storage",
          source_name: bucket,
        });
      }

      bucketManifests.push({
        bucket,
        object_count: objectManifests.length,
        total_bytes: objectManifests.reduce((sum, item) => sum + item.bytes, 0),
        objects: objectManifests,
      });
    }

    const manifest: BackupManifest = {
      app: "aruba-royalty-stamp",
      backup_version: backupVersion,
      backup_id: backupId,
      created_at: startedAt,
      created_by: createdBy,
      backup_mode: "full",
      package_format: "tar.gz",
      tables: tableManifests,
      buckets: bucketManifests,
      row_counts: Object.fromEntries(tableManifests.map((table) => [table.table, table.record_count])),
      object_counts: Object.fromEntries(bucketManifests.map((bucket) => [bucket.bucket, bucket.object_count])),
      total_database_bytes: totalDatabaseBytes,
      total_storage_bytes: totalStorageBytes,
      file_list: fileList,
      sha256_checksums: checksums,
      auth_notice: "Supabase Auth users are not included in this package and require platform-level Auth export/restore support.",
    };

    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
    const manifestSha256 = sha256Buffer(manifestBuffer);
    await addBufferToTar(gzip, "manifest.json", manifestBuffer);
    fileList.push({
      path: "manifest.json",
      size: manifestBuffer.length,
      sha256: manifestSha256,
      source_type: "metadata",
      source_name: "manifest",
    });
    checksums["manifest.json"] = manifestSha256;

    await writeChunk(gzip, Buffer.alloc(1024));
    gzip.end();
    await gzipPipeline;

    const packageStats = await fs.promises.stat(packagePath);
    const packageSha256 = packageHash.digest("hex");
    const storagePath = `${backupId}/${packageName}`;

    const { error: uploadError } = await admin.storage
      .from("system-backups")
      .upload(storagePath, fs.createReadStream(packagePath) as any, {
        contentType: "application/gzip",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    await updateJob(admin, backupId, {
      status: "completed",
      package_path: storagePath,
      package_sha256: packageSha256,
      package_size_bytes: packageStats.size,
      manifest,
      completed_at: new Date().toISOString(),
    });

    return {
      backupId,
      packagePath: storagePath,
      packageName,
      packageSizeBytes: packageStats.size,
      packageSha256,
      manifest,
    };
  } catch (error: any) {
    await updateJob(admin, backupId, {
      status: "failed",
      error_message: error.message || "Backup failed",
      completed_at: new Date().toISOString(),
    });
    throw error;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}