import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { backupBucketName } from "@/lib/server/backupConfig";
import {
  getValidationChunkIndex,
  getValidationChunkPath,
  validationUploadChunkBytes,
  verifyValidationUploadToken,
} from "@/lib/server/backupValidationUpload";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readChunk(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > validationUploadChunkBytes) {
      throw new Error(`Backup upload chunk exceeds the ${validationUploadChunkBytes} byte chunk limit.`);
    }

    chunks.push(buffer);
  }

  if (totalBytes <= 0) {
    throw new Error("Backup upload chunk is empty.");
  }

  return Buffer.concat(chunks, totalBytes);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const adminUserId = await requireSuperAdmin(req);
    const uploadToken = String(req.headers["x-backup-upload-token"] || "");
    const chunkIndex = getValidationChunkIndex(req.headers["x-backup-chunk-index"]);
    const payload = verifyValidationUploadToken(uploadToken);

    if (payload.adminUserId !== adminUserId) {
      return res.status(403).json({ error: "This backup upload token does not belong to the current Super Admin session." });
    }

    if (chunkIndex >= payload.expectedChunks) {
      return res.status(400).json({ error: "Backup upload chunk index is outside the expected range." });
    }

    const chunk = await readChunk(req);
    const isLastChunk = chunkIndex === payload.expectedChunks - 1;

    if (!isLastChunk && chunk.length !== validationUploadChunkBytes) {
      return res.status(400).json({ error: "Backup upload chunk size does not match the expected chunk size." });
    }

    const admin = createServiceClient();
    const chunkPath = getValidationChunkPath(payload.storagePrefix, chunkIndex);
    const { error } = await admin.storage.from(backupBucketName).upload(chunkPath, chunk, {
      contentType: "application/octet-stream",
      cacheControl: "0",
      upsert: false,
    });

    if (error) {
      throw new Error(error.message || "Backup upload chunk could not be stored.");
    }

    return res.status(200).json({
      success: true,
      chunk_index: chunkIndex,
      chunk_size_bytes: chunk.length,
      received_chunks: chunkIndex + 1,
      expected_chunks: payload.expectedChunks,
    });
  } catch (err: any) {
    const message = err.message || "Backup upload chunk failed.";
    const lower = message.toLowerCase();
    const status = lower.includes("authorization") ? 401 : lower.includes("too large") || lower.includes("exceeds") ? 413 : lower.includes("expired") || lower.includes("invalid") ? 400 : 500;
    return res.status(status).json({ error: status === 500 ? "Backup upload chunk failed." : message });
  }
}