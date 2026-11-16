import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/server/adminAuth";
import {
  SetupReviewError,
  approveBusinessSetup,
  loadBusinessSetupReview,
  requestBusinessSetupChanges,
} from "@/lib/server/setupReview";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser(req: NextApiRequest) {
  const authorization = req.headers.authorization;
  if (!supabaseUrl || !anonKey) throw new SetupReviewError("Supabase server configuration is incomplete.", 500);
  if (!authorization) throw new SetupReviewError("Not authenticated", 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new SetupReviewError("Not authenticated", 401);

  return { userId: data.user.id, userClient };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, userClient } = await requireUser(req);
    const admin = createServiceClient();

    if (req.method === "GET") {
      const review = await loadBusinessSetupReview(admin, userId);
      return res.status(200).json({ success: true, ...review });
    }

    if (req.method === "POST") {
      const action = req.body?.action;
      const requestId = req.body?.requestId;
      if (typeof requestId !== "string" || !UUID_PATTERN.test(requestId)) {
        throw new SetupReviewError("A valid setup request ID is required.", 400);
      }

      if (action === "approve") {
        const draftUpdatedAt = req.body?.draftUpdatedAt;
        if (typeof draftUpdatedAt !== "string" || !draftUpdatedAt) {
          throw new SetupReviewError("Reload the setup review before approving.", 400);
        }
        const result = await approveBusinessSetup(userClient, requestId, draftUpdatedAt);
        const review = await loadBusinessSetupReview(admin, userId);
        return res.status(200).json({ success: true, alreadyCompleted: result?.already_completed === true, ...review });
      }

      if (action === "request_changes") {
        const feedback = typeof req.body?.feedback === "string" ? req.body.feedback : "";
        await requestBusinessSetupChanges(userClient, requestId, feedback);
        const review = await loadBusinessSetupReview(admin, userId);
        return res.status(200).json({ success: true, ...review });
      }

      throw new SetupReviewError("Unknown setup review action.", 400);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    if (error instanceof SetupReviewError) {
      return res.status(error.status).json({ error: error.message });
    }
    if (String(error?.message || "").includes("managed business")) {
      return res.status(403).json({ error: "Only a Business Owner or Admin can review setup." });
    }
    console.error("Setup review request failed:", error);
    return res.status(500).json({ error: "Setup review request failed." });
  }
}