import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type AddonRequestBody = {
  addon_id?: string;
  quantity?: number;
  subscription_id?: string;
};

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : fallback;
}

function getDefaultPeriodEnd() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

function buildPaymentReference() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RS-ADDON-${Date.now()}-${suffix}`;
}

async function requireBusinessOwner(req: NextApiRequest) {
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

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("*")
    .eq("owner_id", userData.user.id)
    .maybeSingle();

  if (businessError) throw businessError;
  if (!business) {
    throw new Error("Business Owner access required");
  }

  return { admin, userId: userData.user.id, business };
}

async function getOverview(admin: any, business: any) {
  const [{ data: plan }, { data: effectiveLimit }, { data: memberRows }, { data: availableAddons }, { data: businessAddons }, { data: payments }] = await Promise.all([
    admin
      .from("subscription_plans")
      .select("*")
      .eq("id", business.subscription_plan || "starter")
      .maybeSingle(),
    admin.rpc("get_business_effective_numeric_limit", {
      p_business_id: business.id,
      p_key: "max_customers",
      p_fallback: 300,
    }),
    admin
      .from("customer_loyalty_cards")
      .select("customer_id")
      .eq("business_id", business.id)
      .not("customer_id", "is", null),
    admin
      .from("subscription_addons")
      .select("*")
      .eq("addon_type", "customer_capacity")
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .order("capacity_amount", { ascending: true }),
    admin
      .from("business_addon_subscriptions")
      .select(`
        *,
        subscription_addons (
          id,
          name,
          description,
          addon_type,
          capacity_amount,
          monthly_price_awg,
          status
        )
      `)
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
    admin
      .from("subscription_payments")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
  ]);

  const uniqueMemberCount = new Set((memberRows || []).map((row: any) => row.customer_id)).size;
  const addonPayments = (payments || []).filter((payment: any) => payment.metadata?.kind === "addon_purchase");

  return {
    business,
    currentPlan: plan,
    effectiveCustomerLimit: Number(effectiveLimit ?? plan?.max_customers ?? 300),
    currentMemberCount: uniqueMemberCount,
    availableAddons: availableAddons || [],
    businessAddons: businessAddons || [],
    addonPayments,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { admin, userId, business } = await requireBusinessOwner(req);

    if (req.method === "GET") {
      const overview = await getOverview(admin, business);
      return res.status(200).json({ success: true, ...overview });
    }

    if (req.method !== "POST" && req.method !== "PATCH") {
      res.setHeader("Allow", "GET, POST, PATCH");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body as AddonRequestBody;

    if (req.method === "POST") {
      if (!body.addon_id) {
        return res.status(400).json({ error: "Add-on is required" });
      }

      const quantity = toPositiveInteger(body.quantity, 1);

      const { data: addon, error: addonError } = await admin
        .from("subscription_addons")
        .select("*")
        .eq("id", body.addon_id)
        .maybeSingle();

      if (addonError) throw addonError;
      if (!addon) {
        return res.status(404).json({ error: "Add-on not found" });
      }
      if (addon.addon_type !== "customer_capacity") {
        return res.status(400).json({ error: "Only customer capacity add-ons are available for business purchase in this phase" });
      }
      if (addon.status !== "active") {
        return res.status(400).json({ error: "This add-on is not available for new purchase" });
      }

      const now = new Date().toISOString();
      const currentPeriodEnd = getDefaultPeriodEnd();
      const amount = Number(addon.monthly_price_awg || 0) * quantity;
      const addedCapacity = Number(addon.capacity_amount || 0) * quantity;

      const { data: subscription, error: subscriptionError } = await admin
        .from("business_addon_subscriptions")
        .insert({
          business_id: business.id,
          addon_id: addon.id,
          quantity,
          status: "inactive",
          payment_status: "pending",
          starts_at: now,
          current_period_start: now,
          current_period_end: currentPeriodEnd,
          metadata: {
            source: "business_purchase_request",
            requested_by: userId,
            pending_payment: true,
          },
        })
        .select("id")
        .single();

      if (subscriptionError) throw subscriptionError;

      const paymentReference = buildPaymentReference();
      const { error: paymentError } = await admin.from("subscription_payments").insert({
        business_id: business.id,
        provider: "bank_transfer",
        external_transaction_id: null,
        amount,
        currency: "AWG",
        status: "pending",
        paid_at: null,
        plan_id: null,
        payment_reference: paymentReference,
        metadata: {
          kind: "addon_purchase",
          addon_id: addon.id,
          addon_name: addon.name,
          business_addon_subscription_id: subscription.id,
          quantity,
          capacity_amount: addon.capacity_amount,
          added_capacity: addedCapacity,
          monthly_price_awg: addon.monthly_price_awg,
          requested_by: userId,
        },
      });

      if (paymentError) throw paymentError;
    }

    if (req.method === "PATCH") {
      if (!body.subscription_id) {
        return res.status(400).json({ error: "Add-on subscription ID is required" });
      }

      const { data: subscription, error: subscriptionError } = await admin
        .from("business_addon_subscriptions")
        .select("*")
        .eq("id", body.subscription_id)
        .eq("business_id", business.id)
        .maybeSingle();

      if (subscriptionError) throw subscriptionError;
      if (!subscription) {
        return res.status(404).json({ error: "Add-on subscription not found for this business" });
      }
      if (subscription.status !== "active" || subscription.payment_status !== "approved") {
        return res.status(400).json({ error: "Only active approved add-ons can be scheduled for cancellation" });
      }
      if (subscription.cancel_at_period_end) {
        return res.status(400).json({ error: "This add-on is already scheduled for cancellation" });
      }

      const periodEnd = subscription.current_period_end || getDefaultPeriodEnd();
      const metadata = {
        ...(subscription.metadata || {}),
        cancelled_by: userId,
        cancellation_source: "business_owner_request",
        cancellation_requested_at: new Date().toISOString(),
      };

      const { error: updateError } = await admin
        .from("business_addon_subscriptions")
        .update({
          cancel_at_period_end: true,
          ends_at: periodEnd,
          current_period_end: periodEnd,
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
        .eq("business_id", business.id);

      if (updateError) throw updateError;
    }

    const overview = await getOverview(admin, business);
    return res.status(200).json({ success: true, ...overview });
  } catch (err: any) {
    const message = err.message || "Failed to manage customer capacity add-ons";
    const status = message.includes("access") || message.includes("authenticated") ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}