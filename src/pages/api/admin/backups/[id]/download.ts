import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { once } from "events";
import { pipeline } from "stream/promises";
import type { NextApiRequest, NextApiResponse } from "next";
import { backupBucketName } from "@/lib/server/backupConfig";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";

export const config = {
  maxDuration: 300,
  api: {
    responseLimit: false,
  },
};

type StoredBackupPart = {
  part_number: number;
  storage_path: string;
  size: number;
  sha256: string;
};

function getDownloadFileName(packagePath: string) {
  const baseName = path.posix.basename(packagePath).replace(/\.parts$/, "");
  return baseName.endsWith(".tar.gz") ? baseName : `${baseName}.tar.gz`;
}

function encodeContentDispositionFileName(fileName: string) {
  const safeName = fileName.replace(/["\r\n]/g, "_");
  return `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

async function writeBuffer(stream: fs.WriteStream, buffer: Buffer) {
  if (!stream.write(buffer)) {
    await once(stream, "drain");
  }
}

async function appendStorageObject(
  admin: ReturnType<typeof createServiceClient>,
  writer: fs.WriteStream,
  fullHash: crypto.Hash,
  storagePath: string,
  expectedSize?: number,
  expectedSha256?: string,
) {
  const { data, error } = await admin.storage.from(backupBucketName).download(storagePath);
  if (error) throw error;

  const buffer = Buffer.from(await data.arrayBuffer());
  if (typeof expectedSize === "number" && buffer.length !== expectedSize) {
    throw new Error(`Backup part size mismatch for ${storagePath}`);
  }

  if (expectedSha256) {
    const partSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    if (partSha256 !== expectedSha256) {
      throw new Error(`Backup part checksum mismatch for ${storagePath}`);
    }
  }

  fullHash.update(buffer);
  await writeBuffer(writer, buffer);
  return buffer.length;
}

async function assembleBackupPackage(
  admin: ReturnType<typeof createServiceClient>,
  backup: any,
  tempPath: string,
) {
  const fullHash = crypto.createHash("sha256");
  const writer = fs.createWriteStream(tempPath);
  let totalBytes = 0;

  try {
    const packageParts: StoredBackupPart[] = Array.isArray(backup.manifest?.package_parts)
      ? [...backup.manifest.package_parts].sort((a, b) => Number(a.part_number) - Number(b.part_number))
      : [];

    if (packageParts.length > 0) {
      for (let index = 0; index < packageParts.length; index += 1) {
        const part = packageParts[index];
        const expectedPartNumber = index + 1;

        if (Number(part.part_number) !== expectedPartNumber) {
          throw new Error(`Backup package parts are not sequential at part ${expectedPartNumber}.`);
        }

        totalBytes += await appendStorageObject(
          admin,
          writer,
          fullHash,
          part.storage_path,
          Number(part.size),
          String(part.sha256 || ""),
        );
      }
    } else {
      totalBytes += await appendStorageObject(admin, writer, fullHash, backup.package_path);
    }
  } finally {
    writer.end();
    await once(writer, "finish");
  }

  const actualSha256 = fullHash.digest("hex");
  if (backup.package_sha256 && actualSha256 !== backup.package_sha256) {
    throw new Error("Assembled backup package checksum does not match backup metadata.");
  }

  if (backup.package_size_bytes && Number(backup.package_size_bytes) !== totalBytes) {
    throw new Error("Assembled backup package size does not match backup metadata.");
  }

  return {
    size: totalBytes,
    sha256: actualSha256,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "royalty-stamp-download-"));

  try {
    const adminUserId = await requireSuperAdmin(req);
    const admin = createServiceClient();
    const backupId = String(req.query.id || "");

    const { data: backup, error: backupError } = await admin
      .from("backup_jobs")
      .select("id, status, package_path, package_sha256, package_size_bytes, manifest")
      .eq("id", backupId)
      .maybeSingle();

    if (backupError) throw backupError;
    if (!backup || backup.status !== "completed" || !backup.package_path) {
      return res.status(404).json({ error: "Completed backup package not found" });
    }

    const fileName = getDownloadFileName(String(backup.package_path));
    const tempPath = path.join(tempDir, fileName);
    const assembled = await assembleBackupPackage(admin, backup, tempPath);

    await admin.from("audit_logs").insert({
      admin_user_id: adminUserId,
      action: "download_backup_package",
      target_type: "backup_job",
      target_id: backup.id,
      metadata: {
        package_path: backup.package_path,
        package_size_bytes: assembled.size,
        package_sha256: assembled.sha256,
        package_part_count: Array.isArray((backup.manifest as any)?.package_parts) ? (backup.manifest as any).package_parts.length : 0,
        assembled_download: true,
      },
    });

    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Length", String(assembled.size));
    res.setHeader("Content-Disposition", encodeContentDispositionFileName(fileName));
    res.setHeader("X-Backup-SHA256", assembled.sha256);
    res.status(200);

    await pipeline(fs.createReadStream(tempPath), res);
  } catch (err: any) {
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || "Failed to download backup package" });
    }
    res.destroy(err);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}