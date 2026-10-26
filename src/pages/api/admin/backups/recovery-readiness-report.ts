import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import type { BackupJobForRestorePoint } from "@/lib/server/backupRestorePointInventory";
import { buildRecoveryReadinessExport } from "@/lib/server/recoveryReadinessExport";
import { buildSchemaRecoveryReviewReport } from "@/lib/server/schemaRecoveryReviewReport";

function safeReportFileName(generatedAt: string) {
  const date = Number.isFinite(new Date(generatedAt).getTime())
    ? new Date(generatedAt).toISOString().slice(0, 10)
    : "undated";
  return `royalty-stamp-recovery-readiness-report-${date}.json`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    await requireSuperAdmin(req);
    const admin = createServiceClient();

    const { data, error } = await admin
      .from("backup_jobs")
      .select("id, status, backup_version, package_path, package_sha256, package_size_bytes, manifest, error_message, started_at, completed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const review = buildSchemaRecoveryReviewReport({
      backupJobs: (data || []) as BackupJobForRestorePoint[],
    });
    const report = buildRecoveryReadinessExport(review);

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeReportFileName(report.generated_at)}"`);
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json(report);
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: err.message || "Recovery readiness report export is unavailable.",
    });
  }
}