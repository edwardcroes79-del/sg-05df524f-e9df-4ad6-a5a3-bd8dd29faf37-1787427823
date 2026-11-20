import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const RESTORATION_KIND = "account_restoration";
const RECENT_RESTORE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase server configuration is missing.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

type BusinessAccess = { businessId: string; canManage: boolean };

async function resolveBusinessAccess(admin: SupabaseClient, userId: string): Promise<BusinessAccess | null> {
  const { data: owned, error: ownedError } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (ownedError) throw ownedError;
  if (owned?.id) return { businessId: owned.id, canManage: true };

  const { data: membership, error: membershipError } = await admin
    .from("business_users")
    .select("business_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership?.business_id) return null;

  return {
    businessId: membership.business_id,
    canManage: ["owner", "admin", "corporate_admin"].includes(String(membership.role)),
  };
}

async function loadHoldState(admin: SupabaseClient, businessId: string) {
  const [businessResult, openHoldResult, recentResult] = await Promise.all([
    admin.from("businesses").select("id, status").eq("id", businessId).maybeSingle(),
    admin
      .from("account_holds")
      .select("id, hold_type, reason, placed_at")
      .eq("business_id", businessId)
      .is("resolved_at", null)
      .maybeSingle(),
    admin
      .from("account_holds")
      .select("id, resolved_at")
      .eq("business_id", businessId)
      .not("resolved_at", "is", null)
      .gte("resolved_at", new Date(Date.now() - RECENT_RESTORE_WINDOW_MS).toISOString())
      .order("resolved_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (businessResult.error) throw businessResult.error;
  if (openHoldResult.error) throw openHoldResult.error;
  if (recentResult.error) throw recentResult.error;

  const openHold = openHoldResult.data;
  let pendingRestoration = null;
  let bankDetails: unknown = null;

  if (openHold) {
    const [pendingResult, bankResult] = await Promise.all([
      admin
        .from("subscription_payments")
        .select("id, created_at, amount")
        .eq("business_id", businessId)
        .eq("status", "pending")
        .eq("metadata->>kind", RESTORATION_KIND)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin.from("website_settings").select("value").eq("key", "bank_details").maybeSingle(),
    ]);
    if (pendingResult.error) throw pendingResult.error;
    if (bankResult.error) throw bankResult.error;
    pendingRestoration = pendingResult.data
      ? { id: pendingResult.data.id, createdAt: pendingResult.data.created_at, amount: pendingResult.data.amount === null ? null : Number(pendingResult.data.amount) }
      : null;
    bankDetails = bankResult.data?.value ?? null;
  }

  return {
    status: businessResult.data?.status || "unknown",
    hold: openHold
      ? { id: openHold.id, holdType: openHold.hold_type, reason: openHold.reason, placedAt: openHold.placed_at }
      : null,
    pendingRestoration,
    recentlyRestored: !openHold && recentResult.data
      ? { holdId: recentResult.data.id, resolvedAt: recentResult.data.resolved_at }
      : null,
    bankDetails,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const admin = getAdminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return res.status(401).json({ error: "Not authenticated" });

    const access = await resolveBusinessAccess(admin, userData.user.id);
    if (!access) return res.status(403).json({ error: "No business access." });

    if (req.method === "GET") {
      const state = await loadHoldState(admin, access.businessId);
      return res.status(200).json({ success: true, ...state });
    }

    if (!access.canManage) {
      return res.status(403).json({ error: "Only the business owner or an admin can request account restoration." });
    }

    const proofPath = String(req.body?.proofPath || "").trim();
    const amount = Number(req.body?.amount);
    const reference = String(req.body?.reference || "").trim();

    if (!proofPath.startsWith(`${access.businessId}/`) || proofPath.includes("..") || proofPath.length > 300) {
      return res.status(400).json({ error: "Invalid payment proof." });
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      return res.status(400).json({ error: "Enter a valid payment amount." });
    }
    if (reference.length > 120) {
      return res.status(400).json({ error: "Payment reference is too long." });
    }

    const state = await loadHoldState(admin, access.businessId);
    if (state.status !== "on_hold" || !state.hold) {
      return res.status(409).json({ error: "This account is not on hold." });
    }
    if (state.pendingRestoration) {
      return res.status(409).json({ error: "A restoration request is already awaiting review." });
    }

    const { error: insertError } = await admin.from("subscription_payments").insert({
      business_id: access.businessId,
      provider: "bank_transfer",
      amount,
      currency: "AWG",
      status: "pending",
      payment_proof_url: proofPath,
      payment_reference: reference || null,
      metadata: { kind: RESTORATION_KIND, hold_id: state.hold.id, submitted_by: userData.user.id },
    });
    if (insertError) throw insertError;

    const nextState = await loadHoldState(admin, access.businessId);
    return res.status(200).json({ success: true, ...nextState });
  } catch (error) {
    console.error("Account hold API failed:", error);
    return res.status(500).json({ error: "Account hold request failed." });
  }
}