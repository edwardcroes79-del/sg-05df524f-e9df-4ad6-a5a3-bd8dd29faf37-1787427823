import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { requireSetupSession, sendSetupError } from "@/lib/server/setupSessions";
import { loadSetupWorkspace, markSetupReadyForReview, saveSetupDraft, uploadSetupDraftAsset } from "@/lib/server/setupDrafts";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const superadminUserId = await requireSuperAdmin(req);
    const admin = createServiceClient();
    const sessionId = req.headers["x-setup-session"];
    const ctx = await requireSetupSession(admin, superadminUserId, Array.isArray(sessionId) ? sessionId[0] : sessionId);

    if (req.method === "GET") {
      const workspace = await loadSetupWorkspace(admin, ctx);
      return res.status(200).json({ success: true, workspace });
    }

    if (req.method === "PUT") {
      const workspace = await saveSetupDraft(admin, ctx, superadminUserId, req.body);
      return res.status(200).json({ success: true, workspace });
    }

    if (req.method === "POST" && req.body?.action === "upload") {
      const url = await uploadSetupDraftAsset(admin, ctx, superadminUserId, req.body);
      return res.status(200).json({ success: true, url });
    }

    if (req.method === "POST" && req.body?.action === "ready_for_review") {
      await markSetupReadyForReview(admin, ctx, superadminUserId);
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, PUT, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return sendSetupError(res, error, "Setup workspace request failed.");
  }
}