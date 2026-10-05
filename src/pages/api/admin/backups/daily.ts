import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient } from "@/lib/server/adminAuth";
import { runScheduledBackup } from "@/lib/server/backupScheduler";

export const config = {
  api: {
    responseLimit: false,
  },
};

function isAuthorizedCronRequest(req: NextApiRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const hasSecret = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isVercelCron = req.headers["x-vercel-cron"] === "1";

  if (cronSecret) return hasSecret;
  return isVercelCron || process.env.NODE_ENV !== "production";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: "Unauthorized scheduled backup request" });
  }

  try {
    const admin = createServiceClient();
    const force = process.env.NODE_ENV !== "production" && req.query.force === "1";
    const result = await runScheduledBackup(admin, { force });

    if (result.status === "completed") {
      return res.status(200).json({
        success: true,
        status: result.status,
        backup: {
          id: result.backup.backupId,
          package_path: result.backup.packagePath,
          package_size_bytes: result.backup.packageSizeBytes,
          package_sha256: result.backup.packageSha256,
          package_part_count: result.backup.packageParts.length,
          included_tables: result.backup.manifest.tables.map((table) => table.table),
          included_buckets: result.backup.manifest.buckets.map((bucket) => bucket.bucket),
        },
        retention: result.retention,
      });
    }

    return res.status(200).json({
      success: true,
      status: result.status,
      reason: result.reason,
      running_backup_id: "running_backup_id" in result ? result.running_backup_id : undefined,
      latest_backup_id: "latest_backup_id" in result ? result.latest_backup_id : undefined,
      latest_completed_at: "latest_completed_at" in result ? result.latest_completed_at : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || "Daily backup failed",
    });
  }
}