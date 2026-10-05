import type { NextApiRequest, NextApiResponse } from "next";
import { createBackupPackage } from "@/lib/server/backupEngine";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let adminUserId: string | null = null;
  let admin: ReturnType<typeof createServiceClient> | null = null;

  try {
    adminUserId = await requireSuperAdmin(req);
    admin = createServiceClient();

    const result = await createBackupPackage(admin, adminUserId);

    await admin.from("audit_logs").insert({
      admin_user_id: adminUserId,
      action: "create_backup_package",
      target_type: "backup_job",
      target_id: result.backupId,
      metadata: {
        package_path: result.packagePath,
        package_size_bytes: result.packageSizeBytes,
        package_sha256: result.packageSha256,
        table_count: result.manifest.tables.length,
        storage_bucket_count: result.manifest.buckets.length,
        total_database_bytes: result.manifest.total_database_bytes,
        total_storage_bytes: result.manifest.total_storage_bytes,
      },
    });

    return res.status(200).json({
      success: true,
      backup: {
        id: result.backupId,
        package_path: result.packagePath,
        package_format: "tar.gz",
        package_size_bytes: result.packageSizeBytes,
        package_sha256: result.packageSha256,
        backup_version: result.manifest.backup_version,
        created_at: result.manifest.created_at,
        row_counts: result.manifest.row_counts,
        object_counts: result.manifest.object_counts,
        included_tables: result.manifest.tables.map((table) => table.table),
        included_buckets: result.manifest.buckets.map((bucket) => bucket.bucket),
      },
    });
  } catch (err: any) {
    if (admin && adminUserId) {
      await admin.from("audit_logs").insert({
        admin_user_id: adminUserId,
        action: "create_backup_package_failed",
        target_type: "backup_job",
        target_id: null,
        metadata: {
          error: err.message || "Backup failed",
        },
      });
    }

    return res.status(500).json({ error: err.message || "Failed to create backup" });
  }
}