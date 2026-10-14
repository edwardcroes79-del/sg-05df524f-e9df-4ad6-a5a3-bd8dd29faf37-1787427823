import type { NextApiRequest, NextApiResponse } from "next";
import {
  createServiceClient,
  makeHttpError,
  resolveBusinessForUser,
} from "@/lib/server/memberImport";

async function requireVipMemberIdentificationEntitlement(admin: any, businessId: string) {
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("id, subscription_plan")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError) {
    throw makeHttpError("Unable to verify subscription access.", 500);
  }

  if (!business?.subscription_plan) {
    throw makeHttpError("Subscription plan required.", 403);
  }

  const { data: entitlementRows, error: entitlementError } = await admin
    .from("plan_entitlements")
    .select("key, value_type, boolean_value")
    .eq("plan_id", business.subscription_plan)
    .eq("key", "vip_member_identification")
    .limit(1);

  if (entitlementError) {
    throw makeHttpError("Unable to verify VIP entitlement.", 500);
  }

  const enabled = (entitlementRows || []).some((entitlement: any) =>
    entitlement.key === "vip_member_identification"
    && entitlement.value_type === "boolean"
    && entitlement.boolean_value === true
  );

  if (!enabled) {
    throw makeHttpError("VIP member identification is not enabled for this subscription plan.", 403);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({ error: "Missing authorization header." });
    }

    const { membershipId, isVip } = req.body || {};

    if (typeof membershipId !== "string" || !membershipId.trim()) {
      return res.status(400).json({ error: "Membership id is required." });
    }

    if (typeof isVip !== "boolean") {
      return res.status(400).json({ error: "VIP status must be true or false." });
    }

    const { businessId } = await resolveBusinessForUser(authorization);
    const admin = createServiceClient();

    await requireVipMemberIdentificationEntitlement(admin, businessId);

    const { data: membership, error: membershipError } = await admin
      .from("customer_loyalty_cards")
      .select("id, business_id, loyalty_program_id, status")
      .eq("id", membershipId.trim())
      .eq("business_id", businessId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      throw makeHttpError("Unable to verify this membership.", 500);
    }

    if (!membership?.id) {
      throw makeHttpError("Active membership not found for this business.", 404);
    }

    const { data: updated, error: updateError } = await admin
      .from("customer_loyalty_cards")
      .update({
        is_vip: isVip,
        updated_at: new Date().toISOString(),
      })
      .eq("id", membership.id)
      .eq("business_id", businessId)
      .eq("loyalty_program_id", membership.loyalty_program_id)
      .eq("status", "active")
      .select("id, is_vip")
      .maybeSingle();

    if (updateError || !updated?.id) {
      throw makeHttpError("Unable to update VIP status safely.", 500);
    }

    return res.status(200).json({
      success: true,
      membership: {
        id: updated.id,
        is_vip: updated.is_vip === true,
      },
    });
  } catch (error: any) {
    const statusCode = Number(error.statusCode || 500);
    const safeStatus = [400, 401, 403, 404, 405, 413].includes(statusCode) ? statusCode : 500;
    const safeMessage = safeStatus === 500 ? "Failed to update VIP member status." : error.message || "Unable to update VIP member status.";

    return res.status(safeStatus).json({ error: safeMessage });
  }
}