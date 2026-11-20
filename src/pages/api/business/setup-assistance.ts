import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/server/adminAuth";
import { createSetupAssistanceRequest, listBusinessSetupAssistanceRequests } from "@/lib/server/setupAssistance";

type ApiResponse = {
  success?: boolean;
  businessId?: string;
  businessName?: string;
  latestRequest?: unknown;
  requests?: unknown[];
  hasActiveRequest?: boolean;
  error?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function requireAuthenticatedUser(req: NextApiRequest) {
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase server configuration is incomplete");
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    throw new Error("Missing authorization header");
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Not authenticated");
  }

  return userData.user.id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const userId = await requireAuthenticatedUser(req);
    const admin = createServiceClient();

    if (req.method === "GET") {
      const result = await listBusinessSetupAssistanceRequests(admin, userId);
      return res.status(200).json({ success: true, ...result });
    }

    if (req.method === "POST") {
      await createSetupAssistanceRequest(
        admin,
        userId,
        typeof req.headers.origin === "string" ? req.headers.origin : undefined
      );
      const result = await listBusinessSetupAssistanceRequests(admin, userId);
      return res.status(200).json({ success: true, ...result });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    const message = error?.message || "Setup assistance request failed.";
    const status = message.includes("authenticated") ? 401 : message.includes("active setup assistance request") ? 409 : message.includes("managed business") ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}