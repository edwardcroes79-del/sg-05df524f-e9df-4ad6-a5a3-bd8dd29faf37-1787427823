import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveManagedBusiness } from "@/lib/server/setupAssistance";

const PROGRAM_COLUMNS = "id, name, stamp_target, reward_title, template_id";

const RPC_ERRORS: Array<{ code: string; status: number; message: string }> = [
  { code: "SETUP_NOT_AUTHENTICATED", status: 401, message: "Please sign in again." },
  { code: "SETUP_NOT_AUTHORIZED", status: 403, message: "You are not allowed to review setup for this business." },
  { code: "SETUP_REQUEST_NOT_FOUND", status: 404, message: "Setup request not found." },
  { code: "SETUP_NOT_READY_FOR_REVIEW", status: 409, message: "This setup is no longer waiting for your review." },
  { code: "SETUP_DRAFT_NOT_FOUND", status: 409, message: "No setup draft is available for this request." },
  { code: "SETUP_DRAFT_CHANGED", status: 409, message: "The setup draft changed since you opened it. Reload and review the latest version." },
  { code: "SETUP_DRAFT_INVALID", status: 422, message: "The setup draft is incomplete. Please request changes." },
  { code: "SETUP_TARGET_PROGRAM_INVALID", status: 422, message: "The loyalty program in this draft no longer belongs to your business. Please request changes." },
  { code: "SETUP_STAMP_TARGET_CONFLICT", status: 422, message: "Some customers already have as many stamps as the new target. Activation was stopped to protect their progress. Please request changes." },
  { code: "SETUP_FEEDBACK_INVALID", status: 400, message: "Please describe the changes in 10 to 1000 characters." },
];

export class SetupReviewError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SetupReviewError";
    this.status = status;
  }
}

function mapRpcError(error: { message?: string } | null) {
  const raw = String(error?.message || "");
  const match = RPC_ERRORS.find((entry) => raw.startsWith(entry.code));
  if (match) return new SetupReviewError(match.message, match.status);
  console.error("Setup review RPC failed:", error);
  return new SetupReviewError("Setup review action failed.", 500);
}

export async function loadBusinessSetupReview(admin: SupabaseClient, userId: string) {
  const business = await resolveManagedBusiness(admin, userId);

  const { data: request, error: requestError } = await admin
    .from("setup_assistance_requests")
    .select("id, status, ready_for_review_at, review_round, change_request_feedback, changes_requested_at, approved_at, activated_program_id")
    .eq("business_id", business.businessId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (requestError) throw requestError;

  const { data: businessRow, error: businessError } = await admin
    .from("businesses")
    .select("id, business_name, logo, primary_color, secondary_color")
    .eq("id", business.businessId)
    .maybeSingle();

  if (businessError) throw businessError;

  let draft = null;
  if (request && request.status === "ready_for_review") {
    const { data: draftRow, error: draftError } = await admin
      .from("setup_drafts")
      .select("target_program_id, branding, program, updated_at")
      .eq("setup_request_id", request.id)
      .eq("business_id", business.businessId)
      .maybeSingle();

    if (draftError) throw draftError;

    if (draftRow) {
      let targetProgram = null;
      if (draftRow.target_program_id) {
        const { data: programRow } = await admin
          .from("loyalty_programs")
          .select(PROGRAM_COLUMNS)
          .eq("id", draftRow.target_program_id)
          .eq("business_id", business.businessId)
          .maybeSingle();
        targetProgram = programRow || null;
      }

      draft = {
        targetProgramId: draftRow.target_program_id,
        targetProgram,
        branding: draftRow.branding || {},
        program: draftRow.program || {},
        updatedAt: draftRow.updated_at,
      };
    }
  }

  return {
    business: {
      id: business.businessId,
      name: businessRow?.business_name || business.businessName,
      logo: businessRow?.logo || "",
      primary_color: businessRow?.primary_color || "",
      secondary_color: businessRow?.secondary_color || "",
    },
    request: request
      ? {
          id: request.id,
          status: request.status,
          readyForReviewAt: request.ready_for_review_at,
          reviewRound: Number(request.review_round || 0),
          changeRequestFeedback: request.change_request_feedback,
          changesRequestedAt: request.changes_requested_at,
          approvedAt: request.approved_at,
          activatedProgramId: request.activated_program_id,
        }
      : null,
    draft,
  };
}

export async function approveBusinessSetup(userClient: SupabaseClient, requestId: string, draftUpdatedAt: string) {
  const { data, error } = await (userClient as any).rpc("approve_setup_request", {
    p_request_id: requestId,
    p_expected_draft_updated_at: draftUpdatedAt,
  });

  if (error) throw mapRpcError(error);
  return data as { success: boolean; already_completed: boolean; program_id: string | null };
}

export async function requestBusinessSetupChanges(userClient: SupabaseClient, requestId: string, feedback: string) {
  const { error } = await (userClient as any).rpc("request_setup_changes", {
    p_request_id: requestId,
    p_feedback: feedback,
  });

  if (error) throw mapRpcError(error);
}