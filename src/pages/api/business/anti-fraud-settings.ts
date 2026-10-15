import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const allowedCooldowns = new Set([5, 10, 15]);

function createServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server configuration is incomplete");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function getAuthenticatedUser(req: NextApiRequest) {
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

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    throw new Error("Not authenticated");
  }

  return data.user;
}

async function resolveManageableBusiness(admin: ReturnType<typeof createServiceClient>, userId: string, requestedBusinessId?: string) {
  let businessId = typeof requestedBusinessId === "string" ? requestedBusinessId : "";

  if (!businessId) {
    const { data: dashboardBusiness, error: dashboardError } = await admin.rpc("get_business_dashboard_access_status", {
      p_user_id: userId,
    });

    if (dashboardError) throw dashboardError;

    businessId = Array.isArray(dashboardBusiness) ? dashboardBusiness[0]?.id : dashboardBusiness?.id;
  }

  if (!businessId) {
    throw new Error("Business access required");
  }

  const { data: canManage, error: manageError } = await admin.rpc("can_manage_business_settings", {
    p_business_id: businessId,
    p_user_id: userId,
  });

  if (manageError) throw manageError;

  if (canManage !== true) {
    throw new Error("Only a Business Owner/Admin can manage anti-fraud settings");
  }

  return businessId;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET" && req.method !== "PUT") {
      res.setHeader("Allow", "GET, PUT");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const admin = createServiceClient();
    const user = await getAuthenticatedUser(req);
    const payload = req.method === "GET" ? req.query : req.body;
    const requestedBusinessId = typeof payload.businessId === "string" ? payload.businessId : undefined;
    const businessId = await resolveManageableBusiness(admin, user.id, requestedBusinessId);

    if (req.method === "GET") {
      const { data, error } = await admin.rpc("get_business_anti_fraud_settings", {
        p_business_id: businessId,
      });

      if (error) throw error;

      const settings = Array.isArray(data) ? data[0] : data;

      return res.status(200).json({
        success: true,
        businessId,
        settings: {
          enabled: settings?.enabled === true,
          cooldownMinutes: allowedCooldowns.has(Number(settings?.cooldown_minutes)) ? Number(settings.cooldown_minutes) : 10,
        },
      });
    }

    const enabled = req.body?.enabled === true;
    const cooldownMinutes = Number(req.body?.cooldownMinutes);

    if (!allowedCooldowns.has(cooldownMinutes)) {
      return res.status(400).json({ error: "Cooldown must be 5, 10, or 15 minutes" });
    }

    const { data, error } = await admin.rpc("upsert_business_anti_fraud_settings", {
      p_business_id: businessId,
      p_enabled: enabled,
      p_cooldown_minutes: cooldownMinutes,
      p_user_id: user.id,
    });

    if (error) throw error;

    const settings = Array.isArray(data) ? data[0] : data;

    return res.status(200).json({
      success: true,
      businessId,
      settings: {
        enabled: settings?.enabled === true,
        cooldownMinutes: allowedCooldowns.has(Number(settings?.cooldown_minutes)) ? Number(settings.cooldown_minutes) : 10,
      },
    });
  } catch (error: any) {
    const message = error.message || "Failed to manage anti-fraud settings";
    const status = message.includes("Not authenticated") || message.includes("authorization")
      ? 401
      : message.includes("Owner/Admin") || message.includes("access")
        ? 403
        : message.includes("Cooldown")
          ? 400
          : 500;

    return res.status(status).json({ error: message });
  }
}