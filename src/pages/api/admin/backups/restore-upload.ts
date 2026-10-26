import fs from "fs";
import os from "os";
import path from "path";
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { isRestoreWriteConfirmation } from "@/lib/server/backupRestorePreflight";
import { restoreBackupPackage, type RestoreMode } from "@/lib/server/backupRestoreEngine";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const maxUploadBytes = 1024 * 1024 * 1024;

function getFileName(req: NextApiRequest) {
  const rawName = req.headers["x-backup-filename"];
  const name = Array.isArray(rawName) ? rawName[0] : rawName;
  return decodeURIComponent(String(name || "uploaded-restore-backup.tar.gz")).replace(/[^\w.\-() ]/g, "_");
}

function getRestoreMode(req: NextApiRequest): RestoreMode {
  const rawMode = req.headers["x-restore-mode"];
  const mode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  return mode === "restore" ? "restore" : "dry_run";
}

function getConfirmation(req: NextApiRequest) {
  const rawConfirmation = req.headers["x-restore-confirmation"];
  const confirmation = Array.isArray(rawConfirmation) ? rawConfirmation[0] : rawConfirmation;
  return decodeURIComponent(String(confirmation || ""));
}

function getHeaderValue(req: NextApiRequest, header: string) {
  const rawValue = req.headers[header];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  return decodeURIComponent(String(value || "")).trim();
}

function getRestoreDestination(req: NextApiRequest) {
  return {
    destinationLabel: getHeaderValue(req, "x-restore-destination-label"),
    destinationProjectRef: getHeaderValue(req, "x-restore-destination-project-ref"),
    restoreWritesConfirmed: isRestoreWriteConfirmation(getHeaderValue(req, "x-restore-writes-confirmed")),
  };
}

async function writeRequestToTempFile(req: NextApiRequest, filePath: string) {
  let totalBytes = 0;

  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      totalBytes += chunk.length;
      if (totalBytes > maxUploadBytes) {
        callback(new Error("Backup restore upload exceeds the 1 GB limit"));
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

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "royalty-stamp-restore-"));
  const fileName = getFileName(req);
  const tempPath = path.join(tempDir, fileName);

  try {
    const adminUserId = await requireSuperAdmin(req);
    const contentType = String(req.headers["content-type"] || "");

    if (!contentType.includes("gzip") && !contentType.includes("octet-stream") && !contentType.includes("x-tar")) {
      return res.status(400).json({ error: "Upload must be a gzip/tar backup file." });
    }

    if (!fileName.endsWith(".tar.gz")) {
      return res.status(400).json({ error: "Restore package must be a .tar.gz backup archive." });
    }

    const fileSizeBytes = await writeRequestToTempFile(req, tempPath);
    if (fileSizeBytes === 0) {
      return res.status(400).json({ error: "Uploaded restore package is empty." });
    }

    const report = await restoreBackupPackage({
      admin: createServiceClient(),
      adminUserId,
      uploadedPackagePath: tempPath,
      fileName,
      fileSizeBytes,
      confirmation: getConfirmation(req),
      mode: getRestoreMode(req),
      tempDir,
      destination: getRestoreDestination(req),
    });

    return res.status(report.valid ? 200 : 422).json({
      success: report.valid,
      report,
    });
  } catch (err: any) {
    const message = err.message || "Backup restore failed";
    const lower = message.toLowerCase();
    const status = lower.includes("authorization")
      ? 401
      : lower.includes("confirmation") || lower.includes("destination") || lower.includes("preflight") || lower.includes("requires")
        ? 400
        : 500;

    return res.status(status).json({
      success: false,
      error: status === 500 ? "Backup restore failed" : message,
    });
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}