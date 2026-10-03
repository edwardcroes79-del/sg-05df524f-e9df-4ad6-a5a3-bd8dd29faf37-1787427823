import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type BusinessAddonInput = {
  id?: string;
  business_id?: string;
  addon_id?: string;
  quantity?: number;
  current_period_end?: string | null;
  action?: "create" | "cancel_at_period_end";
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : fallback;
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

async function listBusinessAddons(admin: any) {
  const { data, error } = await admin
    .from("business_addon_subscriptions")
    .select(`
      *,
      businesses (
        id,
        business_name,
        slug,
        subscription_plan
      ),
      subscription_addons (
        id,
        name,
        addon_type,
        capacity_amount,
        monthly_price_awg,
        status
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function getDefaultPeriodEnd() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

function isAssignableAddon(addon: any) {
  return addon?.addon_type === "customer_capacity" || addon?.addon_type === "quick_stamp_qr";
}

function isQuickStampAddon(addon: any) {
  return addon?.id === "quick_stamp_qr" || addon?.slug === "quick-stamp-qr" || addon?.addon_type === "quick_stamp_qr";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const adminUserId = await requireSuperAdmin(req);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "GET") {
      const businessAddons = await listBusinessAddons(admin);
      return res.status(200).json({ success: true, businessAddons });
    }

    if (req.method !== "POST" && req.method !== "PATCH") {
      res.setHeader("Allow", "GET, POST, PATCH");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body as BusinessAddonInput;

    if (req.method === "POST") {
      if (!body.business_id || !body.addon_id) {
        return res.status(400).json({ error: "Business and add-on are required" });
      }

      const { data: addon, error: addonError } = await admin
        .from("subscription_addons")
        .select("id, slug, name, addon_type, capacity_amount, monthly_price_awg, status, metadata")
        .eq("id", body.addon_id)
        .maybeSingle();

      if (addonError) throw addonError;
      if (!addon) {
        return res.status(404).json({ error: "Add-on not found" });
      }
      if (!isAssignableAddon(addon)) {
        return res.status(400).json({ error: "This add-on type is not supported for Super Admin assignment" });
      }
      if (addon.status !== "active") {
        return res.status(400).json({ error: "Archived or inactive add-ons cannot be newly assigned" });
      }

      const { data: business, error: businessError } = await admin
        .from("businesses")
        .select("id")
        .eq("id", body.business_id)
        .maybeSingle();

      if (businessError) throw businessError;
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const currentPeriodEnd = body.current_period_end || getDefaultPeriodEnd();
      const quantity = isQuickStampAddon(addon) ? 1 : toPositiveInteger(body.quantity, 1);
      const addedCapacity = addon.addon_type === "customer_capacity" ? Number(addon.capacity_amount || 0) * quantity : 0;

      const { error } = await admin.from("business_addon_subscriptions").insert({
        business_id: body.business_id,
        addon_id: body.addon_id,
        quantity,
        status: "active",
        payment_status: "approved",
        starts_at: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: currentPeriodEnd,
        metadata: {
          assigned_by: adminUserId,
          source: "super_admin_manual",
          addon_type: addon.addon_type,
          entitlement_key: isQuickStampAddon(addon) ? "quick_stamp_qr" : "max_customers",
          added_capacity: addedCapacity,
        },
      });

      if (error) throw error;

      await admin.from("audit_logs").insert({
        admin_user_id: adminUserId,
        action: "assign_business_addon",
        target_type: "business_addon_subscription",
        target_id: body.business_id,
        metadata: {
          business_id: body.business_id,
          addon_id: body.addon_id,
          quantity,
          addon_type: addon.addon_type,
        },
      });
    }

    if (req.method === "PATCH") {
      if (!body.id) {
        return res.status(400).json({ error: "Business add-on subscription ID is required" });
      }

      const currentPeriodEnd = body.current_period_end || getDefaultPeriodEnd();

      const { error } = await admin
        .from("business_addon_subscriptions")
        .update({
          cancel_at_period_end: true,
          ends_at: currentPeriodEnd,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
          metadata: {
            cancelled_by: adminUserId,
            cancellation_source: "super_admin_manual",
          },
        })
        .eq("id", body.id);

      if (error) throw error;

      await admin.from("audit_logs").insert({
        admin_user_id: adminUserId,
        action: "cancel_business_addon_at_period_end",
        target_type: "business_addon_subscription",
        target_id: body.id,
        metadata: {
          current_period_end: currentPeriodEnd,
        },
      });
    }

    const businessAddons = await listBusinessAddons(admin);
    return res.status(200).json({ success: true, businessAddons });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to manage business add-ons" });
  }
}