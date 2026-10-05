import type { NextApiRequest, NextApiResponse } from "next";
import { backupBucketName } from "@/lib/server/backupConfig";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireSuperAdmin(req);
    const admin = createServiceClient();

    const { data, error } = await admin
      .from("backup_jobs")
      .select("id, status, backup_version, package_path, package_sha256, package_size_bytes, manifest, error_message, started_at, completed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      bucket: backupBucketName,
      backups: data || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to list backups" });
  }
}