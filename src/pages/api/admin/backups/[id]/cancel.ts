import type { NextApiRequest, NextApiResponse } from "next";
import { cancelBackupJob, markStaleBackupJobs } from "@/lib/server/backupLifecycle";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const adminUserId = await requireSuperAdmin(req);
    const admin = createServiceClient();
    await markStaleBackupJobs(admin);

    const backupId = String(req.query.id || "");
    if (!backupId) {
      return res.status(400).json({ error: "Backup ID is required." });
    }

    const result = await cancelBackupJob(admin, backupId, adminUserId);
    return res.status(200).json({ success: true, result });
  } catch (err: any) {
    const message = err.message || "Failed to cancel backup";
    const status = message.includes("Only running backups") || message.includes("not found") ? 409 : 500;
    return res.status(status).json({ error: message });
  }
}