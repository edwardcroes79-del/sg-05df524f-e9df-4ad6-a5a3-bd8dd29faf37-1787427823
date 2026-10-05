import type { NextApiRequest, NextApiResponse } from "next";
import { backupBucketName } from "@/lib/server/backupConfig";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const adminUserId = await requireSuperAdmin(req);
    const admin = createServiceClient();
    const backupId = String(req.query.id || "");

    const { data: backup, error: backupError } = await admin
      .from("backup_jobs")
      .select("id, status, package_path, manifest")
      .eq("id", backupId)
      .maybeSingle();

    if (backupError) throw backupError;
    if (!backup) {
      return res.status(404).json({ error: "Backup not found" });
    }

    // Delete from storage if package exists
    if (backup.package_path) {
      const packageParts = Array.isArray((backup.manifest as any)?.package_parts)
        ? (backup.manifest as any).package_parts
        : [];
      
      const filesToDelete = packageParts.length > 0 
        ? packageParts.map((p: any) => p.storage_path)
        : [backup.package_path];
      
      if (filesToDelete.length > 0) {
         const { error: storageError } = await admin.storage
           .from(backupBucketName)
           .remove(filesToDelete);
         if (storageError) console.error("Failed to delete backup files:", storageError);
      }
    }

    // Delete job record
    const { error: deleteError } = await admin
      .from("backup_jobs")
      .delete()
      .eq("id", backupId);
      
    if (deleteError) throw deleteError;

    await admin.from("audit_logs").insert({
      admin_user_id: adminUserId,
      action: "delete_backup_package",
      target_type: "backup_job",
      target_id: backup.id,
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete backup" });
  }
}