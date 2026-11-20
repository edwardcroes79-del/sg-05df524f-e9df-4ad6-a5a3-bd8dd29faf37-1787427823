import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { FREE_TEMPLATE_IDS, TEMPLATE_PRESET_IDS } from "@/lib/cardTemplatePresets";
import { EDITABLE_SETUP_STATUSES, SetupAccessError, revokeSetupSession, writeSetupAudit, type SetupSessionContext } from "@/lib/server/setupSessions";
import { notifyBusinessAdminOfSetupStatusChange } from "@/lib/server/setupAssistanceNotifications";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const ICON_NAME = /^[A-Za-z0-9]{1,40}$/;
const ASSET_BUCKET = "loyalty-assets";
const MAX_ASSET_BYTES = 2 * 1024 * 1024;
const ASSET_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const ASSET_KINDS = ["card_logo", "card_banner", "business_logo"] as const;
const PROGRAM_COLUMNS = "id, name, description, stamp_target, reward_title, reward_description, reward_expiration_days, template_id, bg_color, primary_color, secondary_color, text_color, stamp_icon, reward_icon, card_logo_url, card_banner_url, active";

export type ProgramDraft = {
  name: string;
  description: string;
  stamp_target: number;
  reward_title: string;
  reward_description: string;
  reward_expiration_days: number | null;
  template_id: string;
  bg_color: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  stamp_icon: string;
  reward_icon: string;
  card_logo_url: string;
  card_banner_url: string;
};

export type BrandingDraft = {
  logo: string;
  primary_color: string;
  secondary_color: string;
};

function readText(value: unknown, label: string, max: number, required = false) {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw new SetupAccessError(`${label} is required.`, 400);
  if (text.length > max) throw new SetupAccessError(`${label} must be ${max} characters or fewer.`, 400);
  return text;
}

function readHex(value: unknown, label: string, optional = false) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text && optional) return "";
  if (!HEX_COLOR.test(text)) throw new SetupAccessError(`${label} must be a hex color such as #F87171.`, 400);
  return text;
}

function readIcon(value: unknown, label: string) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!ICON_NAME.test(text)) throw new SetupAccessError(`${label} is not a valid icon.`, 400);
  return text;
}

function readAssetUrl(value: unknown, label: string, businessId: string, liveUrls: string[]) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  if (liveUrls.includes(text)) return text;
  if (text.length <= 1000 && text.startsWith("https://") && text.includes(`/${ASSET_BUCKET}/${businessId}/`)) return text;
  throw new SetupAccessError(`${label} must be an image uploaded for this business.`, 400);
}

async function loadEntitlements(admin: SupabaseClient, planId: string) {
  const [{ data: plan }, { data: entitlements }] = await Promise.all([
    admin.from("subscription_plans").select("includes_premium_templates").eq("id", planId).maybeSingle(),
    admin
      .from("plan_entitlements")
      .select("key, value_type, boolean_value")
      .eq("plan_id", planId)
      .in("key", ["premium_templates", "reward_expiration"]),
  ]);

  const find = (key: string) => (entitlements || []).find((entry: any) => entry.key === key && entry.value_type === "boolean");

  return {
    hasPremiumTemplates: Boolean(find("premium_templates")?.boolean_value ?? plan?.includes_premium_templates ?? false),
    canUseRewardExpiration: Boolean(find("reward_expiration")?.boolean_value ?? true),
  };
}

export async function loadSetupWorkspace(admin: SupabaseClient, ctx: SetupSessionContext) {
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("id, business_name, logo, primary_color, secondary_color, subscription_plan")
    .eq("id", ctx.businessId)
    .maybeSingle();

  if (businessError) throw businessError;
  if (!business) throw new SetupAccessError("Business not found.", 404);

  const [entitlements, programsResult, draftResult] = await Promise.all([
    loadEntitlements(admin, business.subscription_plan || "starter"),
    admin.from("loyalty_programs").select(PROGRAM_COLUMNS).eq("business_id", ctx.businessId).order("created_at", { ascending: true }),
    admin
      .from("setup_drafts")
      .select("target_program_id, branding, program, updated_at")
      .eq("setup_request_id", ctx.requestId)
      .maybeSingle(),
  ]);

  if (programsResult.error) throw programsResult.error;
  if (draftResult.error) throw draftResult.error;

  return {
    session: { id: ctx.sessionId, requestId: ctx.requestId, startedAt: ctx.startedAt, expiresAt: ctx.expiresAt },
    business: {
      id: String(business.id),
      name: business.business_name || "Business",
      logo: business.logo || "",
      primary_color: business.primary_color || "",
      secondary_color: business.secondary_color || "",
    },
    entitlements,
    livePrograms: programsResult.data || [],
    draft: draftResult.data
      ? {
          targetProgramId: draftResult.data.target_program_id as string | null,
          branding: draftResult.data.branding as Partial<BrandingDraft>,
          program: draftResult.data.program as Partial<ProgramDraft>,
          updatedAt: draftResult.data.updated_at as string,
        }
      : null,
  };
}

export async function saveSetupDraft(admin: SupabaseClient, ctx: SetupSessionContext, superadminUserId: string, body: any) {
  const workspace = await loadSetupWorkspace(admin, ctx);
  const { entitlements, livePrograms, business } = workspace;

  const targetProgramId = typeof body?.targetProgramId === "string" && body.targetProgramId ? body.targetProgramId : null;
  if (targetProgramId && !livePrograms.some((program: any) => program.id === targetProgramId)) {
    throw new SetupAccessError("The selected loyalty program does not belong to this business.", 400);
  }

  const liveUrls = [business.logo, ...livePrograms.flatMap((program: any) => [program.card_logo_url, program.card_banner_url])].filter(Boolean);
  const input = body?.program || {};

  const stampTarget = Number(input.stamp_target);
  if (!Number.isInteger(stampTarget) || stampTarget < 2 || stampTarget > 50) {
    throw new SetupAccessError("Stamps required must be a whole number between 2 and 50.", 400);
  }

  let rewardExpirationDays: number | null = null;
  if (entitlements.canUseRewardExpiration && input.reward_expiration_days !== null && input.reward_expiration_days !== undefined && input.reward_expiration_days !== "") {
    rewardExpirationDays = Number(input.reward_expiration_days);
    if (!Number.isInteger(rewardExpirationDays) || rewardExpirationDays < 1 || rewardExpirationDays > 365) {
      throw new SetupAccessError("Reward expiration must be between 1 and 365 days.", 400);
    }
  }

  const templateId = readText(input.template_id, "Card template", 50, true);
  if (!TEMPLATE_PRESET_IDS.includes(templateId)) throw new SetupAccessError("Unknown card template.", 400);
  if (!FREE_TEMPLATE_IDS.includes(templateId) && !entitlements.hasPremiumTemplates) {
    throw new SetupAccessError("Premium templates are not included in this business's plan.", 403);
  }

  const program: ProgramDraft = {
    name: readText(input.name, "Program name", 120, true),
    description: readText(input.description, "Program description", 1000),
    stamp_target: stampTarget,
    reward_title: readText(input.reward_title, "Reward title", 120, true),
    reward_description: readText(input.reward_description, "Reward instructions", 1000),
    reward_expiration_days: rewardExpirationDays,
    template_id: templateId,
    bg_color: readHex(input.bg_color, "Background color"),
    primary_color: readHex(input.primary_color, "Primary color"),
    secondary_color: readHex(input.secondary_color, "Secondary color", true),
    text_color: readHex(input.text_color, "Text color"),
    stamp_icon: readIcon(input.stamp_icon, "Stamp icon"),
    reward_icon: readIcon(input.reward_icon, "Reward icon"),
    card_logo_url: readAssetUrl(input.card_logo_url, "Card logo", ctx.businessId, liveUrls),
    card_banner_url: readAssetUrl(input.card_banner_url, "Card banner", ctx.businessId, liveUrls),
  };

  const brandingInput = body?.branding || {};
  const branding: BrandingDraft = {
    logo: readAssetUrl(brandingInput.logo, "Business logo", ctx.businessId, liveUrls),
    primary_color: readHex(brandingInput.primary_color, "Brand primary color", true),
    secondary_color: readHex(brandingInput.secondary_color, "Brand secondary color", true),
  };

  const { error } = await admin.from("setup_drafts").upsert(
    {
      setup_request_id: ctx.requestId,
      business_id: ctx.businessId,
      target_program_id: targetProgramId,
      branding,
      program,
      updated_by: superadminUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setup_request_id" }
  );

  if (error) throw error;

  await writeSetupAudit(admin, superadminUserId, "setup_draft.saved", ctx.requestId, {
    business_id: ctx.businessId,
    session_id: ctx.sessionId,
    target_program_id: targetProgramId,
    sections: ["branding", "card_design", "loyalty_program"],
    template_id: program.template_id,
    stamp_target: program.stamp_target,
  });

  return loadSetupWorkspace(admin, ctx);
}

export async function uploadSetupDraftAsset(admin: SupabaseClient, ctx: SetupSessionContext, superadminUserId: string, body: any) {
  const kind = body?.kind;
  if (!ASSET_KINDS.includes(kind)) throw new SetupAccessError("Unknown asset type.", 400);

  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const extension = ASSET_TYPES[contentType];
  if (!extension) throw new SetupAccessError("Upload a PNG, JPG, WebP or GIF image.", 400);

  const base64 = typeof body?.data === "string" ? body.data : "";
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) throw new SetupAccessError("The uploaded file is empty.", 400);
  if (buffer.length > MAX_ASSET_BYTES) throw new SetupAccessError("Images must be 2 MB or smaller.", 400);

  const path = `${ctx.businessId}/setup-drafts/${ctx.requestId}/${kind}-${randomUUID()}.${extension}`;
  const { error } = await admin.storage.from(ASSET_BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (error) throw error;

  const { data } = admin.storage.from(ASSET_BUCKET).getPublicUrl(path);

  await writeSetupAudit(admin, superadminUserId, "setup_draft.asset_uploaded", ctx.requestId, {
    business_id: ctx.businessId,
    session_id: ctx.sessionId,
    kind,
    path,
    size_bytes: buffer.length,
  });

  return data.publicUrl;
}

export async function markSetupReadyForReview(admin: SupabaseClient, ctx: SetupSessionContext, superadminUserId: string) {
  const { data: draft, error: draftError } = await admin
    .from("setup_drafts")
    .select("target_program_id, program")
    .eq("setup_request_id", ctx.requestId)
    .maybeSingle();

  if (draftError) throw draftError;
  if (!draft || !(draft.program as Partial<ProgramDraft>)?.name) {
    throw new SetupAccessError("Save the setup draft before marking it ready for review.", 400);
  }

  const { data: businessRecord, error: businessError } = await admin
    .from("businesses")
    .select("business_name")
    .eq("id", ctx.businessId)
    .maybeSingle();

  if (businessError) throw businessError;

  const now = new Date().toISOString();
  const { data: currentRequest, error: currentRequestError } = await admin
    .from("setup_assistance_requests")
    .select("status, review_round, requested_by")
    .eq("id", ctx.requestId)
    .maybeSingle();

  if (currentRequestError) throw currentRequestError;
  if (!currentRequest || !EDITABLE_SETUP_STATUSES.includes(currentRequest.status)) {
    throw new SetupAccessError("This setup request is no longer open for setup changes.", 409);
  }

  const reviewRound = Number(currentRequest.review_round || 0) + 1;
  const { data: updated, error: updateError } = await admin
    .from("setup_assistance_requests")
    .update({ status: "ready_for_review", ready_for_review_at: now, review_round: reviewRound, updated_at: now })
    .eq("id", ctx.requestId)
    .eq("status", currentRequest.status)
    .select("id");

  if (updateError) throw updateError;
  if (!updated || updated.length === 0) {
    throw new SetupAccessError("This setup request changed while it was being submitted. Please try again.", 409);
  }

  await writeSetupAudit(admin, superadminUserId, "setup_request.ready_for_review", ctx.requestId, {
    business_id: ctx.businessId,
    session_id: ctx.sessionId,
    target_program_id: draft.target_program_id,
    previous_status: currentRequest.status,
    review_round: reviewRound,
    marked_at: now,
  });

  try {
    let recipientEmail: string | null = null;

    if (currentRequest.requested_by) {
      const { data: requesterProfile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", currentRequest.requested_by)
        .maybeSingle();

      recipientEmail = requesterProfile?.email || null;

      if (!recipientEmail) {
        const authResult = await admin.auth.admin.getUserById(String(currentRequest.requested_by));
        recipientEmail = authResult.data.user?.email || null;
      }
    }

    await notifyBusinessAdminOfSetupStatusChange(admin, {
      businessId: ctx.businessId,
      businessName: businessRecord?.business_name || "Business",
      requestId: ctx.requestId,
      recipientEmail,
      status: "ready_for_review",
      eventDate: now,
      reviewRound,
    });
  } catch (notificationError) {
    console.error("Setup ready-for-review notification failed:", notificationError);
  }

  await revokeSetupSession(admin, superadminUserId, ctx.sessionId, "ready_for_review");
}