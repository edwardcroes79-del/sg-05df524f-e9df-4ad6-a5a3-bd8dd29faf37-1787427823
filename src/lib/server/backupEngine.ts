import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { once } from "events";
import { pipeline } from "stream/promises";
import zlib from "zlib";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  backupBucketName,
  backupVersion,
  maxBackupObjectBytes,
  requiredBuckets,
  requiredTables,
  tablePageSize,
  type BackupFileEntry,
  type BackupManifest,
  type BackupPackagePart,
  type StorageObjectManifest,
  type TableManifest,
} from "@/lib/server/backupConfig";
import { addBufferToTar, addFileToTar, finishTar, safeArchivePath, sha256Buffer, writeChunk } from "@/lib/server/backupTar";

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

  return {
    buffer,
    manifest: {
      bucket,
      object_path: objectPath,
      archive_path: `storage/${bucket}/${safeArchivePath(objectPath)}`,
      bytes: buffer.length,
      sha256: sha256Buffer(buffer),
      content_type: data.type || undefined,
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

async function hashFileSlice(filePath: string, start: number, end: number) {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath, { start, end });

  for await (const chunk of stream) {
    hash.update(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return hash.digest("hex");
}

async function uploadBackupPackage(admin: SupabaseClient, backupId: string, packagePath: string, packageName: string, packageSize: number) {
  if (packageSize <= maxBackupObjectBytes) {
    const storagePath = `${backupId}/${packageName}`;
    const { error } = await admin.storage
      .from(backupBucketName)
      .upload(storagePath, fs.createReadStream(packagePath) as any, { contentType: "application/gzip", upsert: false });

    if (error) throw error;

    return {
      packagePath: storagePath,
      parts: [] as BackupPackagePart[],
    };
  }

  const parts: BackupPackagePart[] = [];
  let offset = 0;
  let partNumber = 1;

  while (offset < packageSize) {
    const end = Math.min(offset + maxBackupObjectBytes, packageSize) - 1;
    const partSize = end - offset + 1;
    const partPath = `${backupId}/${packageName}.part-${String(partNumber).padStart(4, "0")}`;
    const partSha256 = await hashFileSlice(packagePath, offset, end);
    const partStream = fs.createReadStream(packagePath, { start: offset, end });

    const { error } = await admin.storage
      .from(backupBucketName)
      .upload(partPath, partStream as any, { contentType: "application/octet-stream", upsert: false });

    if (error) throw error;

    parts.push({
      part_number: partNumber,
      storage_path: partPath,
      size: partSize,
      sha256: partSha256,
    });

    offset = end + 1;
    partNumber += 1;
  }

  return {
    packagePath: `${backupId}/${packageName}.parts`,
    parts,
  };
}

function buildManifest(
  backupId: string,
  startedAt: string,
  createdBy: string,
  tableManifests: TableManifest[],
  bucketManifests: BackupManifest["buckets"],
  fileList: BackupFileEntry[],
  checksums: Record<string, string>,
) {
  return {
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
    total_database_bytes: tableManifests.reduce((sum, table) => sum + table.bytes, 0),
    total_storage_bytes: bucketManifests.reduce((sum, bucket) => sum + bucket.total_bytes, 0),
    file_list: fileList,
    sha256_checksums: checksums,
    auth_notice: "Supabase Auth users are not included in this package and require platform-level Auth export/restore support.",
  } satisfies BackupManifest;
}

export async function createBackupPackage(admin: SupabaseClient, createdBy: string) {
  const startedAt = new Date().toISOString();
  const { data: job, error: jobError } = await (admin as any)
    .from("backup_jobs")
    .insert({ status: "running", backup_version: backupVersion, created_by: createdBy, started_at: startedAt })
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

  try {
    for (const table of requiredTables) {
      const exported = await exportTable(admin, table, tempDir);
      await addFileToTar(gzip, exported.archivePath, exported.tempPath, exported.bytes);
      checksums[exported.archivePath] = exported.sha256;
      tableManifests.push({ table, path: exported.archivePath, record_count: exported.recordCount, bytes: exported.bytes, sha256: exported.sha256 });
      fileList.push({ path: exported.archivePath, size: exported.bytes, sha256: exported.sha256, source_type: "database", source_name: table });
    }

    for (const bucket of requiredBuckets) {
      const objects = await listBucketObjects(admin, bucket);
      const objectManifests: StorageObjectManifest[] = [];

      for (const objectPath of objects) {
        const downloaded = await downloadStorageObject(admin, bucket, objectPath);
        await addBufferToTar(gzip, downloaded.manifest.archive_path, downloaded.buffer);
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

    const manifest = buildManifest(backupId, startedAt, createdBy, tableManifests, bucketManifests, fileList, checksums);
    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
    const manifestSha256 = sha256Buffer(manifestBuffer);
    await addBufferToTar(gzip, "manifest.json", manifestBuffer);
    fileList.push({ path: "manifest.json", size: manifestBuffer.length, sha256: manifestSha256, source_type: "metadata", source_name: "manifest" });
    checksums["manifest.json"] = manifestSha256;
    await finishTar(gzip);
    await gzipPipeline;

    const packageStats = await fs.promises.stat(packagePath);
    const packageSha256 = packageHash.digest("hex");
    const uploadedPackage = await uploadBackupPackage(admin, backupId, packagePath, packageName, packageStats.size);
    const storedManifest = uploadedPackage.parts.length > 0
      ? { ...manifest, package_parts: uploadedPackage.parts }
      : manifest;

    await updateJob(admin, backupId, {
      status: "completed",
      package_path: uploadedPackage.packagePath,
      package_sha256: packageSha256,
      package_size_bytes: packageStats.size,
      manifest: storedManifest,
      completed_at: new Date().toISOString(),
    });

    return {
      backupId,
      packagePath: uploadedPackage.packagePath,
      packageName,
      packageSizeBytes: packageStats.size,
      packageSha256,
      packageParts: uploadedPackage.parts,
      manifest: storedManifest,
    };
  } catch (error: any) {
    await updateJob(admin, backupId, { status: "failed", error_message: error.message || "Backup failed", completed_at: new Date().toISOString() });
    throw error;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}