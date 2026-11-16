import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { revokeSetupSession, sendSetupError, startSetupSession } from "@/lib/server/setupSessions";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const superadminUserId = await requireSuperAdmin(req);
    const admin = createServiceClient();

    if (req.method === "POST") {
      const session = await startSetupSession(admin, superadminUserId, req.body?.requestId);
      return res.status(200).json({ success: true, session });
    }

    if (req.method === "DELETE") {
      const result = await revokeSetupSession(admin, superadminUserId, req.body?.sessionId);
      return res.status(200).json({ success: true, ...result });
    }

    res.setHeader("Allow", "POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return sendSetupError(res, error, "Setup session request failed.");
  }
}