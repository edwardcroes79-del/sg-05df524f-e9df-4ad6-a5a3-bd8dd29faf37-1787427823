import type { NextApiRequest, NextApiResponse } from "next";
import {
  createServiceClient,
  makeHttpError,
  parseWorkbookRows,
  readRequestBuffer,
  resolveBusinessForUser,
} from "@/lib/server/memberImport";
import { buildReconcilePreview, requireBulkMemberRemovalEntitlement } from "@/lib/server/memberReconciliation";

export const config = {
  api: {
    bodyParser: false,
  },
};

function getTargetProgramId(req: NextApiRequest) {
  const value = req.query.programId;
  return typeof value === "string" && value.trim() ? value.trim() : "";
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

    const targetProgramId = getTargetProgramId(req);
    if (!targetProgramId) {
      return res.status(400).json({ error: "Select a loyalty program before previewing reconciliation." });
    }

    const contentType = req.headers["content-type"] || "";
    if (!String(contentType).includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) {
      throw makeHttpError("Upload a genuine .xlsx workbook.", 400);
    }

    const { businessId } = await resolveBusinessForUser(authorization);
    const admin = createServiceClient();

    await requireBulkMemberRemovalEntitlement(admin, businessId);

    const buffer = await readRequestBuffer(req);
    const rows = await parseWorkbookRows(buffer);
    const preview = await buildReconcilePreview(admin, businessId, rows, targetProgramId);

    return res.status(200).json({ success: true, preview });
  } catch (error: any) {
    const statusCode = Number(error.statusCode || 500);
    const safeStatus = [400, 401, 403, 405, 413].includes(statusCode) ? statusCode : 500;
    const safeMessage = safeStatus === 500 ? "Failed to preview member reconciliation." : error.message || "Unable to preview member reconciliation.";

    return res.status(safeStatus).json({ error: safeMessage });
  }
}