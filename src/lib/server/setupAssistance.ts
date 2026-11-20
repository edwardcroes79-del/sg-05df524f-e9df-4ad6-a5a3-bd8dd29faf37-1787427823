import type { SupabaseClient } from "@supabase/supabase-js";
import { EDITABLE_SETUP_STATUSES, listActiveSetupSessions } from "@/lib/server/setupSessions";

export type SetupAssistanceStatus = "pending" | "accepted" | "ready_for_review" | "changes_requested" | "declined" | "completed";

const ACTIVE_SETUP_STATUSES: SetupAssistanceStatus[] = ["pending", "accepted", "ready_for_review", "changes_requested"];

type ManagedBusiness = {
  businessId: string;
  businessName: string;
};

function profileLabel(profile: any) {
  if (!profile) return "Unknown user";
  return profile.full_name || profile.email || "Unknown user";
}

async function loadUserDirectory(admin: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { label: string; email: string | null }>();
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const directory = new Map<string, { label: string; email: string | null }>();
  const unresolvedUserIds: string[] = [];

  for (const userId of userIds) {
    const profile = (profiles || []).find((entry) => String(entry.id) === String(userId));
    const label = profileLabel(profile);
    const email = profile?.email || null;

    if (label !== "Unknown user" || email) {
      directory.set(String(userId), {
        label: label !== "Unknown user" ? label : email || "Unknown user",
        email,
      });
    } else {
      unresolvedUserIds.push(String(userId));
    }
  }

  for (const userId of unresolvedUserIds) {
    const authResult = await admin.auth.admin.getUserById(userId);
    const authEmail = authResult.data.user?.email || null;
    directory.set(String(userId), {
      label: authEmail || "Unknown user",
      email: authEmail,
    });
  }

  return directory;
}

export async function resolveManagedBusiness(admin: SupabaseClient, userId: string): Promise<ManagedBusiness> {
  const { data: ownedBusiness, error: ownedBusinessError } = await admin
    .from("businesses")
    .select("id, business_name")
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownedBusinessError) throw ownedBusinessError;
  if (ownedBusiness?.id) {
    return {
      businessId: String(ownedBusiness.id),
      businessName: ownedBusiness.business_name || "Unknown business",
    };
  }

  const { data: membership, error: membershipError } = await admin
    .from("business_users")
    .select("business_id, businesses ( business_name )")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "admin", "corporate_admin"])
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership?.business_id) {
    throw new Error("No managed business found for this user.");
  }

  const relatedBusiness = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;

  return {
    businessId: String(membership.business_id),
    businessName: relatedBusiness?.business_name || "Unknown business",
  };
}

export async function listBusinessSetupAssistanceRequests(admin: SupabaseClient, userId: string) {
  const business = await resolveManagedBusiness(admin, userId);

  const { data, error } = await admin
    .from("setup_assistance_requests")
    .select("*")
    .eq("business_id", business.businessId)
    .order("requested_at", { ascending: false });

  if (error) throw error;

  const requests = (data || []).map((request) => ({
    id: request.id,
    businessId: request.business_id,
    status: request.status,
    requestedAt: request.requested_at,
    reviewedBy: request.reviewed_by,
    reviewedAt: request.reviewed_at,
    readyForReviewAt: request.ready_for_review_at,
    changeRequestFeedback: request.change_request_feedback,
    changesRequestedAt: request.changes_requested_at,
    approvedAt: request.approved_at,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  }));

  const latestRequest = requests[0] || null;
  const hasActiveRequest = requests.some((request) => ACTIVE_SETUP_STATUSES.includes(request.status));

  return {
    businessId: business.businessId,
    businessName: business.businessName,
    latestRequest,
    requests,
    hasActiveRequest,
  };
}

export async function createSetupAssistanceRequest(admin: SupabaseClient, userId: string) {
  const business = await resolveManagedBusiness(admin, userId);

  const { data: existingActiveRequest, error: existingActiveRequestError } = await admin
    .from("setup_assistance_requests")
    .select("id, status")
    .eq("business_id", business.businessId)
    .in("status", ACTIVE_SETUP_STATUSES)
    .limit(1)
    .maybeSingle();

  if (existingActiveRequestError) throw existingActiveRequestError;
  if (existingActiveRequest?.id) {
    throw new Error("This business already has an active setup assistance request.");
  }

  const { data, error } = await admin
    .from("setup_assistance_requests")
    .insert({
      business_id: business.businessId,
      requested_by: userId,
      status: "pending",
      requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    if (String(error.message || "").toLowerCase().includes("idx_setup_assistance_requests_active_unique")) {
      throw new Error("This business already has an active setup assistance request.");
    }
    throw error;
  }

  return {
    businessId: business.businessId,
    businessName: business.businessName,
    request: {
      id: data.id,
      businessId: data.business_id,
      status: data.status,
      requestedAt: data.requested_at,
      reviewedBy: data.reviewed_by,
      reviewedAt: data.reviewed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}

export async function listAllSetupAssistanceRequests(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("setup_assistance_requests")
    .select("id, business_id, requested_by, status, requested_at, reviewed_by, reviewed_at, ready_for_review_at, review_round, change_request_feedback, changes_requested_at, changes_requested_by, approved_at, approved_by, activated_program_id, created_at, updated_at, businesses ( business_name )")
    .order("requested_at", { ascending: false });

  if (error) throw error;

  const userIds = Array.from(new Set((data || []).flatMap((request) => [request.requested_by, request.reviewed_by, request.approved_by, request.changes_requested_by].filter(Boolean))));
  const [userDirectory, activeSessions] = await Promise.all([
    loadUserDirectory(admin, userIds.map((id) => String(id))),
    listActiveSetupSessions(
      admin,
      (data || []).filter((request) => EDITABLE_SETUP_STATUSES.includes(request.status)).map((request) => String(request.id))
    ),
  ]);

  return (data || []).map((request) => {
    const business = Array.isArray(request.businesses) ? request.businesses[0] : request.businesses;
    const activeSession = activeSessions.get(String(request.id)) || null;
    const requestedByEntry = userDirectory.get(String(request.requested_by));
    const reviewedByEntry = request.reviewed_by ? userDirectory.get(String(request.reviewed_by)) : null;
    const changesRequestedByEntry = request.changes_requested_by ? userDirectory.get(String(request.changes_requested_by)) : null;
    const approvedByEntry = request.approved_by ? userDirectory.get(String(request.approved_by)) : null;

    return {
      id: request.id,
      businessId: request.business_id,
      businessName: business?.business_name || "Unknown business",
      status: request.status,
      requestedAt: request.requested_at,
      reviewedAt: request.reviewed_at,
      requestedBy: requestedByEntry?.label || "Unknown user",
      requestedByEmail: requestedByEntry?.email || null,
      reviewedBy: reviewedByEntry?.label || null,
      readyForReviewAt: request.ready_for_review_at,
      reviewRound: Number(request.review_round || 0),
      changeRequestFeedback: request.change_request_feedback,
      changesRequestedAt: request.changes_requested_at,
      changesRequestedBy: changesRequestedByEntry?.label || null,
      approvedAt: request.approved_at,
      approvedBy: approvedByEntry?.label || null,
      activatedProgramId: request.activated_program_id,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      activeSession: activeSession
        ? { sessionId: activeSession.sessionId, expiresAt: activeSession.expiresAt }
        : null,
    };
  });
}

export async function reviewSetupAssistanceRequest(
  admin: SupabaseClient,
  requestId: string,
  reviewerUserId: string,
  status: Extract<SetupAssistanceStatus, "accepted" | "declined" | "completed">
) {
  const { data: existingRequest, error: existingRequestError } = await admin
    .from("setup_assistance_requests")
    .select("id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (existingRequestError) throw existingRequestError;
  if (!existingRequest?.id) throw new Error("Setup assistance request not found.");
  if (existingRequest.status !== "pending") {
    throw new Error("Only pending setup assistance requests can be updated in this action.");
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("setup_assistance_requests")
    .update({
      status,
      reviewed_by: reviewerUserId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", requestId);

  if (error) throw error;
}