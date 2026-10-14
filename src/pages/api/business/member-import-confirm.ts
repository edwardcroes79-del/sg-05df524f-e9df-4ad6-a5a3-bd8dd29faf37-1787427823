import type { NextApiRequest, NextApiResponse } from "next";
import {
  createImportedMemberships,
  createServiceClient,
  requireExcelImportEntitlement,
  resolveBusinessForUser,
  type ImportPreviewRow,
} from "@/lib/server/memberImport";

function isImportRow(value: any): value is ImportPreviewRow {
  return value
    && typeof value.rowNumber === "number"
    && typeof value.memberName === "string"
    && typeof value.emailAddress === "string"
    && typeof value.phoneNumber === "string"
    && typeof value.loyaltyProgram === "string"
    && typeof value.status === "string"
    && Array.isArray(value.messages);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({ error: "Missing authorization header." });
    }

    const { targetProgramId, rows, importToken } = req.body || {};

    if (typeof targetProgramId !== "string" || !targetProgramId.trim()) {
      return res.status(400).json({ error: "Select a target loyalty program before confirming the import." });
    }

    if (!Array.isArray(rows) || rows.length === 0 || !rows.every(isImportRow)) {
      return res.status(400).json({ error: "Preview rows are required before confirming the import." });
    }

    if (typeof importToken !== "string" || !importToken.trim()) {
      return res.status(400).json({ error: "Preview the workbook again before confirming the import." });
    }

    const { businessId } = await resolveBusinessForUser(authorization);
    const admin = createServiceClient();

    await requireExcelImportEntitlement(admin, businessId);

    const result = await createImportedMemberships(admin, businessId, targetProgramId.trim(), rows, importToken.trim());

    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    const statusCode = Number(error.statusCode || 500);
    const safeStatus = [400, 401, 403, 405, 413].includes(statusCode) ? statusCode : 500;
    const safeMessage = safeStatus === 500 ? "Failed to confirm member import." : error.message || "Unable to confirm member import.";

    return res.status(safeStatus).json({ error: safeMessage });
  }
}