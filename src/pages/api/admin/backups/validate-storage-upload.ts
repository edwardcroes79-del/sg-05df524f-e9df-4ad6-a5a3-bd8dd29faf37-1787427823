import fs from "fs";
import os from "os";
import path from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";
import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { backupBucketName } from "@/lib/server/backupConfig";
import { validateBackupArchive } from "@/lib/server/backupValidator";
import {
  getValidationChunkPath,
  maxValidationUploadBytes,
  maxValidationUploadMegabytes,
  verifyValidationUploadToken,
} from "@/lib/server/backupValidationUpload";

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
    responseLimit: false,
  },
};

async function appendResponseToTempFile(response: Response, filePath: string, currentBytes: number) {
  if (!response.body) {
    throw new Error("Uploaded backup package could not be read from Storage.");
  }

  let totalBytes = currentBytes;
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

  await pipeline(Readable.fromWeb(response.body as any), limiter, fs.createWriteStream(filePath, { flags: "a" }));
  return totalBytes;
}

async function downloadChunkToTempFile(admin: ReturnType<typeof createServiceClient>, chunkPath: string, tempPath: string, currentBytes: number) {
  const { data, error } = await admin.storage.from(backupBucketName).createSignedUrl(chunkPath, 60);

  if (error || !data?.signedUrl) {
    throw new Error("Uploaded backup package chunk was not found or the upload expired before validation.");
  }

  const response = await fetch(data.signedUrl);
  if (!response.ok) {
    throw new Error(response.status === 404
      ? "Uploaded backup package chunk was not found or the upload expired before validation."
      : "Uploaded backup package chunk could not be downloaded for validation.");
  }

  return appendResponseToTempFile(response, tempPath, currentBytes);
}

async function removeValidationChunks(admin: ReturnType<typeof createServiceClient>, storagePrefix: string, expectedChunks: number) {
  if (!storagePrefix) return;

  const chunkPaths = Array.from({ length: expectedChunks }, (_item, index) => getValidationChunkPath(storagePrefix, index));
  if (chunkPaths.length > 0) {
    await admin.storage.from(backupBucketName).remove(chunkPaths);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "royalty-stamp-storage-validate-"));
  const admin = createServiceClient();
  let storagePrefix = "";
  let expectedChunks = 0;

  try {
    const adminUserId = await requireSuperAdmin(req);
    const uploadToken = String(req.body?.uploadToken || "");
    const declaredClientSize = Number(req.body?.fileSizeBytes || 0);
    const payload = verifyValidationUploadToken(uploadToken);

    storagePrefix = payload.storagePrefix;
    expectedChunks = payload.expectedChunks;

    if (payload.adminUserId !== adminUserId) {
      return res.status(403).json({ error: "This backup upload is not authorized for the current administrator." });
    }

    if (!Number.isFinite(declaredClientSize) || declaredClientSize <= 0) {
      return res.status(400).json({ error: "Backup package size is required before validation." });
    }

    if (declaredClientSize !== payload.fileSizeBytes) {
      return res.status(400).json({
        error: `Backup package size changed during upload. Expected ${payload.fileSizeBytes} bytes, received ${declaredClientSize} bytes.`,
      });
    }

    if (declaredClientSize > maxValidationUploadBytes) {
      return res.status(413).json({
        error: `Backup package is too large. Large backup validation supports packages up to ${maxValidationUploadMegabytes} MB.`,
        max_size_bytes: maxValidationUploadBytes,
        max_size_mb: maxValidationUploadMegabytes,
      });
    }

    const tempPath = path.join(tempDir, payload.fileName);
    let fileSizeBytes = 0;

    for (let index = 0; index < payload.expectedChunks; index += 1) {
      fileSizeBytes = await downloadChunkToTempFile(admin, getValidationChunkPath(payload.storagePrefix, index), tempPath, fileSizeBytes);
    }

    if (fileSizeBytes === 0) {
      return res.status(400).json({ error: "Uploaded backup file is empty." });
    }

    if (fileSizeBytes !== declaredClientSize) {
      return res.status(400).json({
        error: `Uploaded backup size changed during transfer. Expected ${declaredClientSize} bytes, received ${fileSizeBytes} bytes.`,
      });
    }

    const report = await validateBackupArchive(tempPath, payload.fileName, fileSizeBytes);
    const firstError = report.errors[0];
    const failedChecks = report.checks.filter((check) => check.status === "failed");
    const failureSummary = firstError || failedChecks[0]?.details || "Backup validation failed.";

    if (!report.valid) {
      console.warn("Backup storage validation rejected", {
        file_name: payload.fileName,
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
    const lower = message.toLowerCase();
    const status = lower.includes("validation limit") || lower.includes("too large") || lower.includes("exceeds")
      ? 413
      : lower.includes("expired") || lower.includes("invalid")
        ? 400
        : 500;
    return res.status(status).json({ error: status === 500 ? "Backup validation failed." : message });
  } finally {
    await removeValidationChunks(admin, storagePrefix, expectedChunks);
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}