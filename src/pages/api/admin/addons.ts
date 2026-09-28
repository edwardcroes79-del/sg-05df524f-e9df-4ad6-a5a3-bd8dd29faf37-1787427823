import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type AddonStatus = "active" | "inactive" | "archived";

type AddonInput = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  addon_type?: string;
  capacity_amount?: number;
  monthly_price_awg?: number;
  status?: AddonStatus;
  display_order?: number;
  provider?: string | null;
  provider_product_id?: string | null;
  provider_price_id?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStatus(value: unknown): AddonStatus {
  return value === "inactive" || value === "archived" ? value : "active";
}

function normalizeAddonType(value: unknown) {
  return value === "quick_stamp_qr" ? "quick_stamp_qr" : "customer_capacity";
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

async function listAddons(admin: any) {
  const { data, error } = await admin
    .from("subscription_addons")
    .select("*")
    .order("display_order", { ascending: true })
    .order("capacity_amount", { ascending: true });

  if (error) throw error;
  return data || [];
}

function buildAddonPayload(body: AddonInput, currentId?: string) {
  if (!body.name?.trim()) {
    throw new Error("Add-on name is required");
  }

  const addonType = normalizeAddonType(body.addon_type);
  const status = normalizeStatus(body.status);
  const capacityAmount = addonType === "quick_stamp_qr" ? 1 : Math.max(1, Math.trunc(toNumber(body.capacity_amount, 100)));
  const slug = body.slug?.trim() || slugify(addonType === "quick_stamp_qr" ? "quick-stamp-qr" : `${addonType}-${capacityAmount}`);
  const id = currentId || body.id?.trim() || slug.replace(/-/g, "_");

  if (!id || !slug) {
    throw new Error("Add-on ID could not be generated");
  }

  return {
    id,
    name: body.name.trim(),
    slug,
    description: body.description?.trim() || null,
    addon_type: addonType,
    capacity_amount: capacityAmount,
    monthly_price_awg: Math.max(0, toNumber(body.monthly_price_awg, 0)),
    status,
    display_order: Math.trunc(toNumber(body.display_order, 100)),
    provider: body.provider?.trim() || null,
    provider_product_id: body.provider_product_id?.trim() || null,
    provider_price_id: body.provider_price_id?.trim() || null,
    metadata: { entitlement_key: addonType === "quick_stamp_qr" ? "quick_stamp_qr" : "max_customers" },
    archived_at: status === "archived" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const adminUserId = await requireSuperAdmin(req);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "GET") {
      const addons = await listAddons(admin);
      return res.status(200).json({ success: true, addons });
    }

    if (req.method !== "POST" && req.method !== "PATCH") {
      res.setHeader("Allow", "GET, POST, PATCH");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body as AddonInput;
    const addonId = req.method === "PATCH" ? body.id?.trim() : undefined;

    if (req.method === "PATCH" && !addonId) {
      return res.status(400).json({ error: "Add-on ID is required" });
    }

    const payload = buildAddonPayload(body, addonId);

    if (req.method === "POST") {
      const { data: existing } = await admin
        .from("subscription_addons")
        .select("id")
        .eq("id", payload.id)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ error: "An add-on with this ID already exists" });
      }

      const { error } = await admin.from("subscription_addons").insert(payload);
      if (error) throw error;
    } else {
      const { error } = await admin
        .from("subscription_addons")
        .update(payload)
        .eq("id", payload.id);

      if (error) throw error;
    }

    await admin.from("audit_logs").insert({
      admin_user_id: adminUserId,
      action: req.method === "POST" ? "create_subscription_addon" : "update_subscription_addon",
      target_type: "subscription_addon",
      target_id: payload.id,
      metadata: {
        status: payload.status,
        name: payload.name,
        addon_type: payload.addon_type,
        capacity_amount: payload.capacity_amount,
        monthly_price_awg: payload.monthly_price_awg,
      },
    });

    const addons = await listAddons(admin);
    return res.status(200).json({ success: true, addons });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to manage subscription add-ons" });
  }
}