import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function buildReference() {
  return `PLAN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function getAuthenticatedUser(req: NextApiRequest) {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getAuthenticatedUser(req);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "GET") {
      const { data: business, error: businessError } = await admin
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) throw businessError;
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const { data: requests, error: requestError } = await admin
        .from("subscription_payments")
        .select("*")
        .eq("business_id", business.id)
        .eq("status", "pending")
        .eq("metadata->>kind", "subscription_plan_change")
        .order("created_at", { ascending: false });

      if (requestError) throw requestError;

      return res.status(200).json({ success: true, requests: requests || [] });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const requestedPlanId = typeof req.body?.plan_id === "string" ? req.body.plan_id.trim() : "";
    if (!requestedPlanId) {
      return res.status(400).json({ error: "Requested plan is required" });
    }

    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("id, business_name, subscription_plan, subscription_status, owner_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError) throw businessError;
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    if (requestedPlanId === business.subscription_plan) {
      return res.status(400).json({ error: "This plan is already active for your business" });
    }

    const { data: pendingRequests, error: pendingError } = await admin
      .from("subscription_payments")
      .select("id, plan_id, metadata")
      .eq("business_id", business.id)
      .eq("status", "pending")
      .eq("metadata->>kind", "subscription_plan_change")
      .limit(1);

    if (pendingError) throw pendingError;
    if ((pendingRequests || []).length > 0) {
      return res.status(409).json({ error: "Downgrade request pending approval." });
    }

    const { data: plans, error: plansError } = await admin
      .from("subscription_plans")
      .select("id, name, price_awg, max_loyalty_programs, max_customers, max_staff, status, is_active")
      .in("id", [business.subscription_plan || "starter", requestedPlanId]);

    if (plansError) throw plansError;

    const currentPlan = (plans || []).find((plan: any) => plan.id === (business.subscription_plan || "starter"));
    const requestedPlan = (plans || []).find((plan: any) => plan.id === requestedPlanId);

    if (!requestedPlan || requestedPlan.status !== "active" || requestedPlan.is_active === false) {
      return res.status(400).json({ error: "Requested plan is not available" });
    }

    if (!currentPlan) {
      return res.status(400).json({ error: "Current plan could not be resolved" });
    }

    const currentPrice = Number(currentPlan.price_awg || 0);
    const requestedPrice = Number(requestedPlan.price_awg || 0);
    const changeType = requestedPrice < currentPrice ? "downgrade" : "upgrade";

    const [{ count: memberCount }, { count: staffCount }] = await Promise.all([
      admin
        .from("customer_loyalty_cards")
        .select("customer_id", { count: "exact", head: true })
        .eq("business_id", business.id),
      admin
        .from("business_users")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("status", "active"),
    ]);

    const now = new Date().toISOString();
    const { data: request, error: insertError } = await admin
      .from("subscription_payments")
      .insert({
        business_id: business.id,
        provider: "admin_approval",
        amount: requestedPrice,
        currency: "AWG",
        status: "pending",
        plan_id: requestedPlan.id,
        payment_reference: buildReference(),
        metadata: {
          kind: "subscription_plan_change",
          change_type: changeType,
          notification_title: changeType === "downgrade" ? "Subscription Downgrade Request" : "Subscription Upgrade Request",
          notification_status: "pending",
          requested_by: user.id,
          requested_at: now,
          business_name: business.business_name,
          current_plan_id: currentPlan.id,
          current_plan_name: currentPlan.name,
          current_plan_price_awg: currentPrice,
          requested_plan_id: requestedPlan.id,
          requested_plan_name: requestedPlan.name,
          requested_plan_price_awg: requestedPrice,
          current_entitlements: {
            max_loyalty_programs: currentPlan.max_loyalty_programs,
            max_customers: currentPlan.max_customers,
            max_staff: currentPlan.max_staff,
          },
          requested_entitlements: {
            max_loyalty_programs: requestedPlan.max_loyalty_programs,
            max_customers: requestedPlan.max_customers,
            max_staff: requestedPlan.max_staff,
          },
          current_member_count: memberCount || 0,
          current_staff_count: staffCount || 0,
          effective_on: "after_super_admin_approval",
          data_retention_note: "Existing customers, cards, stamps, and rewards are never deleted by a downgrade.",
        },
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    return res.status(200).json({ success: true, request });
  } catch (err: any) {
    const status = err.message === "Not authenticated" || err.message === "Missing authorization header" ? 401 : 500;
    return res.status(status).json({ error: err.message || "Failed to request plan change" });
  }
}