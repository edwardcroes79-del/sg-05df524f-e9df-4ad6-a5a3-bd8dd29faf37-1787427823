import type { NextApiRequest, NextApiResponse } from "next";
import {
  createServiceClient,
  resolveBusinessForUser,
  type ImportPreviewRow,
} from "@/lib/server/memberImport";
import { confirmReconcileRemoval, requireBulkMemberRemovalEntitlement } from "@/lib/server/memberReconciliation";

function isReconcileRow(value: any): value is ImportPreviewRow {
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

    const { targetProgramId, rows, selectedMembershipIds, reconcileToken, confirmationText } = req.body || {};

    if (typeof targetProgramId !== "string" || !targetProgramId.trim()) {
      return res.status(400).json({ error: "Select a target loyalty program before confirming removals." });
    }

    if (!Array.isArray(rows) || rows.length === 0 || !rows.every(isReconcileRow)) {
      return res.status(400).json({ error: "Preview rows are required before confirming removals." });
    }

    if (!Array.isArray(selectedMembershipIds) || !selectedMembershipIds.every((id) => typeof id === "string")) {
      return res.status(400).json({ error: "Selected removal candidates are required." });
    }

    if (typeof reconcileToken !== "string" || !reconcileToken.trim()) {
      return res.status(400).json({ error: "Preview the workbook again before confirming removals." });
    }

    if (confirmationText !== `REMOVE ${selectedMembershipIds.length}`) {
      return res.status(400).json({ error: `Type REMOVE ${selectedMembershipIds.length} to confirm this membership removal.` });
    }

    const { businessId } = await resolveBusinessForUser(authorization);
    const admin = createServiceClient();

    await requireBulkMemberRemovalEntitlement(admin, businessId);

    const result = await confirmReconcileRemoval(
      admin,
      businessId,
      targetProgramId.trim(),
      rows,
      selectedMembershipIds,
      reconcileToken.trim()
    );

    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    const statusCode = Number(error.statusCode || 500);
    const safeStatus = [400, 401, 403, 405, 413].includes(statusCode) ? statusCode : 500;
    const safeMessage = safeStatus === 500 ? "Failed to confirm member reconciliation." : error.message || "Unable to confirm member reconciliation.";

    return res.status(safeStatus).json({ error: safeMessage });
  }
}