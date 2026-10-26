import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { buildBackupVerificationEvidenceRecord } from "@/lib/server/backupVerificationEvidence";
import { verifyStoredBackupPackage } from "@/lib/server/backupStoredPackageVerification";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    await requireSuperAdmin(req);

    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const backupId = String(rawId || "").trim();
    const report = await verifyStoredBackupPackage(createServiceClient(), backupId);
    const verificationEvidence = buildBackupVerificationEvidenceRecord(report);

    const statusCode = report.status === "VALIDATED"
      ? 200
      : report.status === "INVALID" || report.status === "INCOMPLETE"
        ? 422
        : report.status === "BLOCKED"
          ? 400
          : 424;

    return res.status(statusCode).json({
      success: report.status === "VALIDATED",
      report,
      verification_evidence: verificationEvidence,
      persistence: verificationEvidence.persistence,
    });
  } catch (err: any) {
    const message = err.message || "Stored backup package verification failed";
    const lower = message.toLowerCase();
    const status = lower.includes("authorization") || lower.includes("authenticated") || lower.includes("super admin") ? 401 : 500;

    return res.status(status).json({
      success: false,
      error: status === 500 ? "Stored backup package verification failed" : message,
    });
  }
}