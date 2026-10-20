import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { getConfirmationEmailOrigin, getRecipientDomain, sanitizeMailError, sendConfirmationEmail } from "@/lib/server/confirmationEmail";

const resendWindowMs = 15 * 60 * 1000;
const resendLimit = 3;

function isUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function recordAudit(supabase: ReturnType<typeof createServiceClient>, adminUserId: string, targetUserId: string, outcome: string, metadata: Record<string, unknown>) {
  await supabase.from("audit_logs").insert({
    admin_user_id: adminUserId,
    action: "confirmation_email_resend",
    target_type: "auth_user",
    target_id: targetUserId,
    metadata: {
      outcome,
      ...metadata,
    },
  });
}

async function enforceRateLimit(supabase: ReturnType<typeof createServiceClient>, targetUserId: string) {
  const rateKey = `confirmation_resend:${targetUserId}`;
  const action = "admin_confirmation_resend";
  const now = new Date();
  const windowStart = new Date(now.getTime() - resendWindowMs);

  const { data: existing } = await supabase
    .from("api_rate_limits")
    .select("id, attempts, window_start")
    .eq("rate_key", rateKey)
    .eq("action", action)
    .maybeSingle();

  if (existing && new Date(existing.window_start).getTime() >= windowStart.getTime()) {
    if (Number(existing.attempts || 0) >= resendLimit) {
      return false;
    }

    await supabase
      .from("api_rate_limits")
      .update({
        attempts: Number(existing.attempts || 0) + 1,
        updated_at: now.toISOString(),
      })
      .eq("id", existing.id);

    return true;
  }

  await supabase
    .from("api_rate_limits")
    .upsert({
      rate_key: rateKey,
      action,
      attempts: 1,
      window_start: now.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: "rate_key,action" });

  return true;
}

function getDisplayName(metadata: Record<string, unknown>) {
  return typeof metadata.full_name === "string" ? metadata.full_name : undefined;
}

function getAudience(metadata: Record<string, unknown>) {
  if (typeof metadata.full_name === "string") return "customer";
  if (typeof metadata.phone === "string") return "business";
  return "general";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabase = createServiceClient();
  let adminUserId = "";
  let targetUserId = "";

  try {
    adminUserId = await requireSuperAdmin(req);
    const { userId, origin } = req.body;
    targetUserId = userId;

    if (!isUuid(userId)) {
      return res.status(400).json({ error: "A valid target user ID is required." });
    }

    const { data: targetResult, error: targetError } = await supabase.auth.admin.getUserById(userId);

    if (targetError || !targetResult?.user?.email) {
      await recordAudit(supabase, adminUserId, userId, "failed", { reason: "target_not_found" });
      return res.status(404).json({ error: "User account was not found." });
    }

    const targetUser = targetResult.user;
    const recipientDomain = getRecipientDomain(targetUser.email);

    if (targetUser.email_confirmed_at || targetUser.confirmed_at) {
      await recordAudit(supabase, adminUserId, userId, "already_confirmed", { recipient_domain: recipientDomain });
      return res.status(200).json({
        success: true,
        alreadyConfirmed: true,
        message: "This account is already confirmed. No email was sent.",
      });
    }

    const allowed = await enforceRateLimit(supabase, userId);
    if (!allowed) {
      await recordAudit(supabase, adminUserId, userId, "rate_limited", { recipient_domain: recipientDomain });
      return res.status(429).json({ error: "Too many confirmation resends for this account. Try again later." });
    }

    const finalOrigin = getConfirmationEmailOrigin(origin);
    const redirectTo = `${finalOrigin}/auth/login?confirmed=true`;
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.email,
      options: {
        redirectTo,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      await recordAudit(supabase, adminUserId, userId, "failed", { recipient_domain: recipientDomain, reason: "link_generation_failed" });
      return res.status(500).json({ error: "Could not generate a confirmation link for this account." });
    }

    const metadata = targetUser.user_metadata && typeof targetUser.user_metadata === "object" ? targetUser.user_metadata as Record<string, unknown> : {};

    try {
      await sendConfirmationEmail({
        email: targetUser.email,
        actionLink: linkData.properties.action_link,
        audience: getAudience(metadata),
        displayName: getDisplayName(metadata),
      });

      await recordAudit(supabase, adminUserId, userId, "submitted", { recipient_domain: recipientDomain });
      return res.status(200).json({
        success: true,
        message: "Confirmation email was submitted. Delivery to the inbox is not guaranteed.",
      });
    } catch (mailError) {
      const safeError = sanitizeMailError(mailError);
      await recordAudit(supabase, adminUserId, userId, "failed", { recipient_domain: recipientDomain, reason: "smtp_send_failed" });
      return res.status(502).json({ error: safeError });
    }
  } catch (error: any) {
    if (adminUserId && targetUserId && isUuid(targetUserId)) {
      await recordAudit(supabase, adminUserId, targetUserId, "failed", { reason: "unexpected_error" }).catch(() => undefined);
    }

    const message = error.message || "Confirmation resend failed.";
    const status = message.includes("Super Admin") ? 403 : message.includes("authenticated") || message.includes("authorization") ? 401 : 500;
    return res.status(status).json({ error: status === 500 ? "Confirmation resend failed." : message });
  }
}