import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { backupBucketName } from "@/lib/server/backupConfig";
import {
  createValidationUploadToken,
  isAllowedBackupUploadContentType,
  isPlausibleBackupFileName,
  maxValidationUploadBytes,
  maxValidationUploadMegabytes,
  safeBackupUploadFileName,
  staleValidationUploadMs,
  validationUploadChunkBytes,
  validationUploadPrefix,
  validationUploadTtlMs,
} from "@/lib/server/backupValidationUpload";

async function cleanupStaleValidationUploads(admin: ReturnType<typeof createServiceClient>, adminUserId: string) {
  const prefix = `${validationUploadPrefix}/${adminUserId}`;
  const { data } = await admin.storage.from(backupBucketName).list(prefix, { limit: 100, sortBy: { column: "created_at", order: "asc" } });
  const stalePaths = (data || [])
    .filter((item) => {
      const createdAt = item.created_at ? new Date(item.created_at).getTime() : 0;
      return createdAt > 0 && Date.now() - createdAt > staleValidationUploadMs;
    })
    .map((item) => `${prefix}/${item.name}`);

  if (stalePaths.length > 0) {
    await admin.storage.from(backupBucketName).remove(stalePaths);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const adminUserId = await requireSuperAdmin(req);
    const admin = createServiceClient();
    const fileName = safeBackupUploadFileName(String(req.body?.fileName || ""));
    const fileSizeBytes = Number(req.body?.fileSizeBytes || 0);
    const contentType = String(req.body?.contentType || "application/octet-stream");

    if (!isPlausibleBackupFileName(fileName)) {
      return res.status(400).json({ error: "Upload must be a Royalty Stamp .tar.gz backup file." });
    }

    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
      return res.status(400).json({ error: "Backup package size is required before upload." });
    }

    if (fileSizeBytes > maxValidationUploadBytes) {
      return res.status(413).json({
        error: `Backup package is too large. Large backup validation supports packages up to ${maxValidationUploadMegabytes} MB.`,
        max_size_bytes: maxValidationUploadBytes,
        max_size_mb: maxValidationUploadMegabytes,
      });
    }

    if (!isAllowedBackupUploadContentType(contentType)) {
      return res.status(400).json({ error: "Upload content type is not allowed for backup validation." });
    }

    await cleanupStaleValidationUploads(admin, adminUserId);

    const uploadId = crypto.randomUUID();
    const storagePrefix = `${validationUploadPrefix}/${adminUserId}/${Date.now()}-${uploadId}`;
    const expectedChunks = Math.ceil(fileSizeBytes / validationUploadChunkBytes);
    const expiresAt = Date.now() + validationUploadTtlMs;
    const uploadToken = createValidationUploadToken({
      adminUserId,
      storagePrefix,
      fileName,
      fileSizeBytes,
      expectedChunks,
      expiresAt,
    });

    return res.status(200).json({
      success: true,
      uploadMode: "chunked-storage",
      bucket: backupBucketName,
      uploadId,
      storagePrefix,
      uploadToken,
      fileName,
      fileSizeBytes,
      expectedChunks,
      chunkSizeBytes: validationUploadChunkBytes,
      max_size_bytes: maxValidationUploadBytes,
      max_size_mb: maxValidationUploadMegabytes,
      expires_at: new Date(expiresAt).toISOString(),
    });
  } catch (err: any) {
    const message = err.message || "Could not initialize backup upload.";
    const status = message.toLowerCase().includes("authorization") ? 401 : 500;
    return res.status(status).json({ error: status === 500 ? "Could not initialize backup upload." : message });
  }
}