import fs from "fs";
import os from "os";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import { requireSuperAdmin } from "@/lib/server/adminAuth";
import { validateBackupArchive } from "@/lib/server/backupValidator";

export const config = {
  api: {
    bodyParser: false,
  },
};

const maxUploadBytes = 1024 * 1024 * 1024;

function getFileName(req: NextApiRequest) {
  const rawName = req.headers["x-backup-filename"];
  const name = Array.isArray(rawName) ? rawName[0] : rawName;
  return decodeURIComponent(String(name || "uploaded-backup.tar.gz")).replace(/[^\w.\-() ]/g, "_");
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
    if (!contentType.includes("gzip") && !contentType.includes("octet-stream") && !contentType.includes("x-tar")) {
      return res.status(400).json({ error: "Upload must be a gzip/tar backup file." });
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