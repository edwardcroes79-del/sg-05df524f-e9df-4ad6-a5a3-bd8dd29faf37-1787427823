import type { SupabaseClient } from "@supabase/supabase-js";
import { listActiveSetupSessions } from "@/lib/server/setupSessions";

export type SetupAssistanceStatus = "pending" | "accepted" | "ready_for_review" | "declined" | "completed";

const ACTIVE_SETUP_STATUSES: SetupAssistanceStatus[] = ["pending", "accepted", "ready_for_review"];

type ManagedBusiness = {
  businessId: string;
  businessName: string;
};

function profileLabel(profile: any) {
  if (!profile) return "Unknown user";
  return profile.full_name || profile.email || "Unknown user";
}

async function loadUserLabels(admin: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const labels = new Map<string, string>();
  const unresolvedUserIds: string[] = [];

  for (const userId of userIds) {
    const profile = (profiles || []).find((entry) => String(entry.id) === String(userId));
    const label = profileLabel(profile);

    if (label !== "Unknown user") {
      labels.set(String(userId), label);
    } else {
      unresolvedUserIds.push(String(userId));
    }
  }

  for (const userId of unresolvedUserIds) {
    const authResult = await admin.auth.admin.getUserById(userId);
    const authEmail = authResult.data.user?.email || null;
    if (authEmail) {
      labels.set(String(userId), authEmail);
    }
  }

  return labels;
}

async function resolveManagedBusiness(admin: SupabaseClient, userId: string): Promise<ManagedBusiness> {
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
    .select("id, business_id, requested_by, status, requested_at, reviewed_by, reviewed_at, created_at, updated_at, businesses ( business_name )")
    .order("requested_at", { ascending: false });

  if (error) throw error;

  const userIds = Array.from(new Set((data || []).flatMap((request) => [request.requested_by, request.reviewed_by].filter(Boolean))));
  const [userLabels, activeSessions] = await Promise.all([
    loadUserLabels(admin, userIds.map((id) => String(id))),
    listActiveSetupSessions(
      admin,
      (data || []).filter((request) => request.status === "accepted").map((request) => String(request.id))
    ),
  ]);

  return (data || []).map((request) => {
    const business = Array.isArray(request.businesses) ? request.businesses[0] : request.businesses;
    const activeSession = activeSessions.get(String(request.id)) || null;
    return {
      id: request.id,
      businessId: request.business_id,
      businessName: business?.business_name || "Unknown business",
      status: request.status,
      requestedAt: request.requested_at,
      reviewedAt: request.reviewed_at,
      requestedBy: userLabels.get(String(request.requested_by)) || "Unknown user",
      reviewedBy: request.reviewed_by ? userLabels.get(String(request.reviewed_by)) || "Unknown user" : null,
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