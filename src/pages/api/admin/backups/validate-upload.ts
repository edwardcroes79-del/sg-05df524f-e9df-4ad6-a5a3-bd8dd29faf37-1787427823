import fs from "fs";
import os from "os";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import { requireSuperAdmin } from "@/lib/server/adminAuth";
import { validateBackupArchive } from "@/lib/server/backupValidator";

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const maxUploadBytes = 1024 * 1024 * 1024;

function getFileName(req: NextApiRequest) {
  const rawName = req.headers["x-backup-filename"];
  const name = Array.isArray(rawName) ? rawName[0] : rawName;
  return decodeURIComponent(String(name || "uploaded-backup.tar.gz")).replace(/[^\w.\-() ]/g, "_");
}

function isPlausibleBackupFileName(fileName: string) {
  return decodeURIComponent(fileName || "").trim().toLowerCase().includes(".tar.gz");
}

function isAllowedUploadContentType(contentType: string) {
  const normalized = contentType.toLowerCase();
  return (
    normalized === "" ||
    normalized.includes("gzip") ||
    normalized.includes("octet-stream") ||
    normalized.includes("x-tar") ||
    normalized.includes("tar")
  );
}

async function writeRequestToTempFile(req: NextApiRequest, filePath: string) {
  let totalBytes = 0;

  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      totalBytes += chunk.length;
      if (totalBytes > maxUploadBytes) {
        callback(new Error("Backup upload exceeds the 1 GB validation limit"));
        return;
      }
      callback(null, chunk);
    },
  });

  await pipeline(req, limiter, fs.createWriteStream(filePath));
  return totalBytes;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "royalty-stamp-validate-"));
  const fileName = getFileName(req);
  const tempPath = path.join(tempDir, fileName);

  try {
    await requireSuperAdmin(req);

    const contentType = String(req.headers["content-type"] || "");
    if (!isPlausibleBackupFileName(fileName)) {
      return res.status(400).json({
        error: "Upload must be a Royalty Stamp .tar.gz backup file.",
        file: {
          name: fileName,
          content_type: contentType || "empty",
          client_type: decodeURIComponent(String(req.headers["x-backup-client-type"] || "")),
          client_size: String(req.headers["x-backup-client-size"] || ""),
        },
      });
    }

    if (!isAllowedUploadContentType(contentType)) {
      return res.status(400).json({
        error: "Upload content type is not allowed for backup validation.",
        file: {
          name: fileName,
          content_type: contentType || "empty",
          client_type: decodeURIComponent(String(req.headers["x-backup-client-type"] || "")),
          client_size: String(req.headers["x-backup-client-size"] || ""),
        },
      });
    }

    const fileSizeBytes = await writeRequestToTempFile(req, tempPath);
    if (fileSizeBytes === 0) {
      return res.status(400).json({ error: "Uploaded backup file is empty." });
    }

    const report = await validateBackupArchive(tempPath, fileName, fileSizeBytes);

    return res.status(report.valid ? 200 : 422).json({
      success: report.valid,
      report,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Backup validation failed" });
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}