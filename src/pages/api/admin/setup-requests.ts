import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { listAllSetupAssistanceRequests, reviewSetupAssistanceRequest } from "@/lib/server/setupAssistance";

type ApiResponse = {
  success?: boolean;
  requests?: unknown[];
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const reviewerUserId = await requireSuperAdmin(req);
    const admin = createServiceClient();

    if (req.method === "GET") {
      const requests = await listAllSetupAssistanceRequests(admin);
      return res.status(200).json({ success: true, requests });
    }

    if (req.method === "PATCH") {
      const { requestId, status } = req.body || {};

      if (typeof requestId !== "string" || !requestId) {
        return res.status(400).json({ error: "A valid request ID is required." });
      }

      if (status !== "accepted" && status !== "declined") {
        return res.status(400).json({ error: "Status must be accepted or declined." });
      }

      await reviewSetupAssistanceRequest(admin, requestId, reviewerUserId, status);
      const requests = await listAllSetupAssistanceRequests(admin);
      return res.status(200).json({ success: true, requests });
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    const message = error?.message || "Setup request management failed.";
    const status = message.includes("authenticated") ? 401 : message.includes("Super Admin") ? 403 : message.includes("required") || message.includes("not found") || message.includes("Only pending") ? 400 : 500;
    return res.status(status).json({ error: message });
  }
}