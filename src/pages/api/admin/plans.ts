import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type PlanStatus = "active" | "inactive" | "archived";

type EntitlementInput = {
  key: string;
  value_type: "boolean" | "number" | "text";
  boolean_value?: boolean | null;
  number_value?: number | null;
  text_value?: string | null;
};

type PlanInput = {
  id?: string;
  name?: string;
  description?: string | null;
  price_awg?: number;
  annual_price_awg?: number | null;
  status?: PlanStatus;
  display_order?: number;
  badge?: string | null;
  max_loyalty_programs?: number;
  max_customers?: number;
  max_staff?: number;
  is_trial?: boolean;
  trial_days?: number;
  includes_premium_templates?: boolean;
  entitlements?: EntitlementInput[];
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const allowedFeatureKeys = new Set([
  "premium_templates",
  "reward_expiration",
  "custom_card_branding",
  "max_loyalty_programs",
  "max_customers",
  "max_staff",
]);

function slugifyPlanId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStatus(value: unknown): PlanStatus {
  return value === "inactive" || value === "archived" ? value : "active";
}

async function requireSuperAdmin(req: NextApiRequest) {
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

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("is_super_admin, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || (!profile?.is_super_admin && profile?.role !== "super_admin")) {
    throw new Error("Super Admin access required");
  }

  return userData.user.id;
}

async function listPlans(admin: any) {
  const { data: plans, error: planError } = await admin
    .from("subscription_plans")
    .select("*")
    .order("display_order", { ascending: true })
    .order("price_awg", { ascending: true });

  if (planError) throw planError;

  const { data: entitlements, error: entitlementError } = await admin
    .from("plan_entitlements")
    .select("*")
    .order("key", { ascending: true });

  if (entitlementError) throw entitlementError;

  const { data: businesses, error: businessError } = await admin
    .from("businesses")
    .select("subscription_plan");

  if (businessError) throw businessError;

  const assignmentCounts = new Map<string, number>();
  (businesses || []).forEach((business: any) => {
    if (business.subscription_plan) {
      assignmentCounts.set(business.subscription_plan, (assignmentCounts.get(business.subscription_plan) || 0) + 1);
    }
  });

  return (plans || []).map((plan: any) => ({
    ...plan,
    assigned_business_count: assignmentCounts.get(plan.id) || 0,
    entitlements: (entitlements || []).filter((entitlement: any) => entitlement.plan_id === plan.id),
  }));
}

function buildPlanPayload(body: PlanInput, currentId?: string) {
  if (!body.name?.trim()) {
    throw new Error("Plan name is required");
  }

  const status = normalizeStatus(body.status);
  const id = currentId || body.id?.trim() || slugifyPlanId(body.name);

  if (!id) {
    throw new Error("Plan ID could not be generated");
  }

  const maxLoyaltyPrograms = Math.max(1, Math.trunc(toNumber(body.max_loyalty_programs, 1)));
  const maxCustomers = Math.max(1, Math.trunc(toNumber(body.max_customers, 300)));
  const maxStaff = Math.max(0, Math.trunc(toNumber(body.max_staff, 1)));

  return {
    id,
    name: body.name.trim(),
    description: body.description?.trim() || null,
    price_awg: Math.max(0, toNumber(body.price_awg, 0)),
    annual_price_awg: body.annual_price_awg === null || body.annual_price_awg === undefined ? null : Math.max(0, toNumber(body.annual_price_awg, 0)),
    status,
    display_order: Math.trunc(toNumber(body.display_order, 100)),
    badge: body.badge?.trim() || null,
    max_loyalty_programs: maxLoyaltyPrograms,
    max_customers: maxCustomers,
    max_staff: maxStaff,
    is_trial: Boolean(body.is_trial),
    trial_days: Math.max(1, Math.trunc(toNumber(body.trial_days, 14))),
    includes_premium_templates: Boolean(body.includes_premium_templates),
    is_active: status === "active",
    archived_at: status === "archived" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

function normalizeEntitlements(body: PlanInput, payload: ReturnType<typeof buildPlanPayload>) {
  const baseEntitlements: EntitlementInput[] = [
    { key: "premium_templates", value_type: "boolean", boolean_value: payload.includes_premium_templates },
    { key: "reward_expiration", value_type: "boolean", boolean_value: true },
    { key: "custom_card_branding", value_type: "boolean", boolean_value: payload.includes_premium_templates },
    { key: "max_loyalty_programs", value_type: "number", number_value: payload.max_loyalty_programs },
    { key: "max_customers", value_type: "number", number_value: payload.max_customers },
    { key: "max_staff", value_type: "number", number_value: payload.max_staff },
  ];

  const incoming = Array.isArray(body.entitlements) ? body.entitlements : [];
  const merged = new Map<string, EntitlementInput>();
  baseEntitlements.forEach((entitlement) => merged.set(entitlement.key, entitlement));
  incoming.forEach((entitlement) => {
    if (allowedFeatureKeys.has(entitlement.key)) {
      merged.set(entitlement.key, entitlement);
    }
  });

  return Array.from(merged.values()).map((entitlement) => ({
    plan_id: payload.id,
    key: entitlement.key,
    value_type: entitlement.value_type,
    boolean_value: entitlement.value_type === "boolean" ? Boolean(entitlement.boolean_value) : null,
    number_value: entitlement.value_type === "number" ? toNumber(entitlement.number_value, 0) : null,
    text_value: entitlement.value_type === "text" ? entitlement.text_value || "" : null,
    updated_at: new Date().toISOString(),
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const adminUserId = await requireSuperAdmin(req);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "GET") {
      const plans = await listPlans(admin);
      return res.status(200).json({ success: true, plans });
    }

    if (req.method !== "POST" && req.method !== "PATCH") {
      res.setHeader("Allow", "GET, POST, PATCH");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body as PlanInput;
    const planId = req.method === "PATCH" ? body.id?.trim() : undefined;

    if (req.method === "PATCH" && !planId) {
      return res.status(400).json({ error: "Plan ID is required" });
    }

    const payload = buildPlanPayload(body, planId);

    if (req.method === "POST") {
      const { data: existing } = await admin
        .from("subscription_plans")
        .select("id")
        .eq("id", payload.id)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ error: "A plan with this ID already exists" });
      }

      const { error } = await admin.from("subscription_plans").insert(payload);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from("subscription_plans")
        .update(payload)
        .eq("id", payload.id);

      if (error) throw error;
    }

    const entitlements = normalizeEntitlements(body, payload);
    const { error: entitlementError } = await admin
      .from("plan_entitlements")
      .upsert(entitlements, { onConflict: "plan_id,key" });

    if (entitlementError) throw entitlementError;

    await admin.from("audit_logs").insert({
      admin_user_id: adminUserId,
      action: req.method === "POST" ? "create_subscription_plan" : "update_subscription_plan",
      target_type: "subscription_plan",
      target_id: payload.id,
      metadata: {
        status: payload.status,
        name: payload.name,
      },
    });

    const plans = await listPlans(admin);
    return res.status(200).json({ success: true, plans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to manage subscription plans" });
  }
}