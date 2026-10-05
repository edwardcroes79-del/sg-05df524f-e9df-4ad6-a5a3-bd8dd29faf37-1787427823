import type { NextApiRequest, NextApiResponse } from "next";
import { backupBucketName } from "@/lib/server/backupConfig";
import { cleanupBackupArtifacts, markStaleBackupJobs } from "@/lib/server/backupLifecycle";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const adminUserId = await requireSuperAdmin(req);
    const admin = createServiceClient();
    await markStaleBackupJobs(admin);
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

    if (backup.status === "running") {
      return res.status(409).json({ error: "A running backup cannot be deleted. Cancel it first, then delete it after cleanup completes." });
    }

    if (!["completed", "failed", "cancelled", "abandoned"].includes(backup.status)) {
      return res.status(409).json({ error: `Backup status ${backup.status} cannot be deleted.` });
    }

    if (backup.status === "completed") {
      const { count, error: countError } = await admin
        .from("backup_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed");

      if (countError) throw countError;
      if ((count || 0) <= 1) {
        return res.status(409).json({ error: "Cannot delete the only completed backup." });
      }
    }

    const cleanup = await cleanupBackupArtifacts(admin, backup as any);

    // Delete from storage if package exists
    if (backup.status === "completed" && backup.package_path) {
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
      metadata: {
        cleanup,
        deleted_status: backup.status,
      },
    });

    return res.status(200).json({ success: true, cleanup });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete backup" });
  }
}