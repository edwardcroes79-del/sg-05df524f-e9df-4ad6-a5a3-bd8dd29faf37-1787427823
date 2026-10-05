import type { NextApiRequest, NextApiResponse } from "next";
import { backupBucketName } from "@/lib/server/backupConfig";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const adminUserId = await requireSuperAdmin(req);
    const admin = createServiceClient();
    const backupId = String(req.query.id || "");

    const { data: backup, error: backupError } = await admin
      .from("backup_jobs")
      .select("id, status, package_path, package_sha256, package_size_bytes, manifest")
      .eq("id", backupId)
      .maybeSingle();

    if (backupError) throw backupError;
    if (!backup || backup.status !== "completed" || !backup.package_path) {
      return res.status(404).json({ error: "Completed backup package not found" });
    }

    const packageParts = Array.isArray((backup.manifest as any)?.package_parts)
      ? (backup.manifest as any).package_parts
      : [];

    if (packageParts.length > 0) {
      const signedParts = await Promise.all(packageParts.map(async (part: any) => {
        const { data: signed, error: signedError } = await admin.storage
          .from(backupBucketName)
          .createSignedUrl(part.storage_path, 300, { download: true });

        if (signedError) throw signedError;

        return {
          part_number: part.part_number,
          download_url: signed.signedUrl,
          size: part.size,
          sha256: part.sha256,
        };
      }));

      await admin.from("audit_logs").insert({
        admin_user_id: adminUserId,
        action: "download_backup_package",
        target_type: "backup_job",
        target_id: backup.id,
        metadata: {
          package_path: backup.package_path,
          package_size_bytes: backup.package_size_bytes,
          package_sha256: backup.package_sha256,
          package_part_count: packageParts.length,
        },
      });

      return res.status(200).json({
        success: true,
        download_parts: signedParts,
        expires_in_seconds: 300,
        package_sha256: backup.package_sha256,
        package_size_bytes: backup.package_size_bytes,
        reassembly: "Concatenate parts in ascending part_number order to recreate the original .tar.gz package.",
      });
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(backupBucketName)
      .createSignedUrl(backup.package_path, 300, { download: true });

    if (signedError) throw signedError;

    await admin.from("audit_logs").insert({
      admin_user_id: adminUserId,
      action: "download_backup_package",
      target_type: "backup_job",
      target_id: backup.id,
      metadata: {
        package_path: backup.package_path,
        package_size_bytes: backup.package_size_bytes,
        package_sha256: backup.package_sha256,
      },
    });

    return res.status(200).json({
      success: true,
      download_url: signed.signedUrl,
      expires_in_seconds: 300,
      package_sha256: backup.package_sha256,
      package_size_bytes: backup.package_size_bytes,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create backup download link" });
  }
}