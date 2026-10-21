import fs from "fs";
import os from "os";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { backupBucketName } from "@/lib/server/backupConfig";
import { validateBackupArchive } from "@/lib/server/backupValidator";

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
    responseLimit: false,
  },
};

const maxValidationUploadBytes = 250 * 1024 * 1024;
const maxValidationUploadMegabytes = maxValidationUploadBytes / 1024 / 1024;
const uploadPrefix = "validation-uploads";

function safeFileName(value: string) {
  return decodeURIComponent(value || "uploaded-backup.tar.gz").replace(/[^\w.\-() ]/g, "_");
}

function isPlausibleBackupFileName(fileName: string) {
  return decodeURIComponent(fileName || "").trim().toLowerCase().includes(".tar.gz");
}

function isOwnedValidationPath(storagePath: string, adminUserId: string) {
  return storagePath.startsWith(`${uploadPrefix}/${adminUserId}/`) && !storagePath.includes("..") && !storagePath.includes("\\");
}

async function writeBlobToTempFile(blob: Blob, filePath: string) {
  let totalBytes = 0;

  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      totalBytes += chunk.length;
      if (totalBytes > maxValidationUploadBytes) {
        callback(new Error(`Backup upload exceeds the ${maxValidationUploadMegabytes} MB validation limit.`));
        return;
      }
      callback(null, chunk);
    },
  });

  await pipeline(Readable.fromWeb(blob.stream() as any), limiter, fs.createWriteStream(filePath));
  return totalBytes;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "royalty-stamp-storage-validate-"));
  const admin = createServiceClient();
  let storagePath = "";

  try {
    const adminUserId = await requireSuperAdmin(req);
    storagePath = String(req.body?.storagePath || "");
    const fileName = safeFileName(String(req.body?.fileName || ""));
    const declaredClientSize = Number(req.body?.fileSizeBytes || 0);

    if (!isOwnedValidationPath(storagePath, adminUserId)) {
      return res.status(403).json({ error: "This backup upload is not authorized for the current administrator." });
    }

    if (!isPlausibleBackupFileName(fileName)) {
      return res.status(400).json({ error: "Upload must be a Royalty Stamp .tar.gz backup file." });
    }

    if (!Number.isFinite(declaredClientSize) || declaredClientSize <= 0) {
      return res.status(400).json({ error: "Backup package size is required before validation." });
    }

    if (declaredClientSize > maxValidationUploadBytes) {
      return res.status(413).json({
        error: `Backup package is too large. Large backup validation supports packages up to ${maxValidationUploadMegabytes} MB.`,
        max_size_bytes: maxValidationUploadBytes,
        max_size_mb: maxValidationUploadMegabytes,
      });
    }

    const { data, error } = await admin.storage.from(backupBucketName).download(storagePath);
    if (error || !data) {
      return res.status(404).json({ error: "Uploaded backup package was not found or the upload URL expired before validation." });
    }

    const tempPath = path.join(tempDir, fileName);
    const fileSizeBytes = await writeBlobToTempFile(data, tempPath);

    if (fileSizeBytes === 0) {
      return res.status(400).json({ error: "Uploaded backup file is empty." });
    }

    if (fileSizeBytes !== declaredClientSize) {
      return res.status(400).json({
        error: `Uploaded backup size changed during transfer. Expected ${declaredClientSize} bytes, received ${fileSizeBytes} bytes.`,
      });
    }

    const report = await validateBackupArchive(tempPath, fileName, fileSizeBytes);
    const firstError = report.errors[0];
    const failedChecks = report.checks.filter((check) => check.status === "failed");
    const failureSummary = firstError || failedChecks[0]?.details || "Backup validation failed.";

    if (!report.valid) {
      console.warn("Backup storage validation rejected", {
        file_name: fileName,
        file_size_bytes: fileSizeBytes,
        backup_version: report.backup_version,
        errors: report.errors,
        failed_checks: failedChecks.map((check) => ({
          name: check.name,
          details: check.details,
        })),
      });
    }

    return res.status(report.valid ? 200 : 422).json({
      success: report.valid,
      error: report.valid ? undefined : failureSummary,
      report,
    });
  } catch (err: any) {
    const message = err.message || "Backup validation failed.";
    const status = message.includes("validation limit") ? 413 : 500;
    return res.status(status).json({ error: message });
  } finally {
    if (storagePath) {
      await admin.storage.from(backupBucketName).remove([storagePath]);
    }
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}