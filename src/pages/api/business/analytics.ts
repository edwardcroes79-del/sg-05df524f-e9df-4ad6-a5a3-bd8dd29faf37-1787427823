import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type DateRange = {
  startAt: string;
  endAt: string;
};

function createServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server configuration is incomplete.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function createUserClient(authorization: string) {
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase client configuration is incomplete.");
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
}

function parseDateRange(req: NextApiRequest): DateRange {
  const now = new Date();
  const range = typeof req.query.range === "string" ? req.query.range : "30d";
  const customStart = typeof req.query.start === "string" ? req.query.start : "";
  const customEnd = typeof req.query.end === "string" ? req.query.end : "";

  let start = new Date(now);
  let end = new Date(now);

  if (range === "custom") {
    if (!customStart || !customEnd) {
      throw new Error("Custom analytics range requires start and end dates.");
    }

    start = new Date(`${customStart}T00:00:00.000Z`);
    end = new Date(`${customEnd}T23:59:59.999Z`);
  } else if (range === "7d") {
    start.setDate(start.getDate() - 6);
  } else if (range === "90d") {
    start.setDate(start.getDate() - 89);
  } else if (range === "12m") {
    start.setMonth(start.getMonth() - 12);
  } else {
    start.setDate(start.getDate() - 29);
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    throw new Error("Invalid analytics date range.");
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

async function resolveBusinessForUser(authorization: string) {
  const userClient = createUserClient(authorization);
  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("Not authenticated.");
  }

  const { data: workspaceRows, error: workspaceError } = await (userClient as any).rpc("get_business_dashboard_access_status");

  if (workspaceError) {
    throw new Error(workspaceError.message);
  }

  const workspace = Array.isArray(workspaceRows) ? workspaceRows[0] : workspaceRows;

  if (!workspace?.id) {
    throw new Error("Business workspace not found.");
  }

  return {
    userId: userData.user.id,
    businessId: workspace.id as string,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({ error: "Missing authorization header." });
    }

    const { userId, businessId } = await resolveBusinessForUser(authorization);
    const { startAt, endAt } = parseDateRange(req);
    const locationId = typeof req.query.location_id === "string" && req.query.location_id !== "all" ? req.query.location_id : null;
    const admin = createServiceClient();

    const { data, error } = await (admin as any).rpc("get_corporate_advanced_analytics", {
      p_business_id: businessId,
      p_actor_user_id: userId,
      p_start_at: startAt,
      p_end_at: endAt,
      p_location_id: locationId,
    });

    if (error) {
      const message = error.message || "Failed to load Corporate Advanced Analytics.";
      const status = message.includes("not enabled") ? 403 : message.includes("access denied") || message.includes("access required") ? 403 : 500;
      return res.status(status).json({ error: message });
    }

    return res.status(200).json({
      analytics: {
        ...(data && typeof data === "object" && !Array.isArray(data) ? data : {}),
        business_id: businessId,
      },
    });
  } catch (err: any) {
    const message = err.message || "Failed to load Corporate Advanced Analytics.";
    const status = message.includes("authenticated") ? 401 : message.includes("not enabled") || message.includes("access") ? 403 : 400;
    return res.status(status).json({ error: message });
  }
}