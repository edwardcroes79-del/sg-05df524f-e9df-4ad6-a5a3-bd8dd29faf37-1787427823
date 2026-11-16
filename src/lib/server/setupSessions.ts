import type { NextApiResponse } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SETUP_SESSION_MINUTES = 45;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_COLUMNS = "id, setup_request_id, business_id, superadmin_user_id, started_at, expires_at, revoked_at";
export const EDITABLE_SETUP_STATUSES = ["accepted", "changes_requested"];

export class SetupAccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "SetupAccessError";
    this.status = status;
  }
}

export type SetupSessionContext = {
  sessionId: string;
  requestId: string;
  businessId: string;
  superadminUserId: string;
  startedAt: string;
  expiresAt: string;
};

export type ActiveSetupSession = {
  sessionId: string;
  expiresAt: string;
  superadminUserId: string;
};

type SessionRow = {
  id: string;
  setup_request_id: string;
  business_id: string;
  superadmin_user_id: string;
  started_at: string;
  expires_at: string;
  revoked_at: string | null;
};

function toContext(session: SessionRow): SetupSessionContext {
  return {
    sessionId: session.id,
    requestId: session.setup_request_id,
    businessId: session.business_id,
    superadminUserId: session.superadmin_user_id,
    startedAt: session.started_at,
    expiresAt: session.expires_at,
  };
}

export function assertUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new SetupAccessError(`A valid ${label} is required.`, 400);
  }
  return value;
}

export function sendSetupError(res: NextApiResponse, error: unknown, fallback: string) {
  if (error instanceof SetupAccessError) {
    return res.status(error.status).json({ error: error.message });
  }

  const message = error instanceof Error ? error.message : "";
  if (message === "Missing authorization header" || message === "Not authenticated") {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (message === "Super Admin access required") {
    return res.status(403).json({ error: message });
  }

  console.error(fallback, error);
  return res.status(500).json({ error: fallback });
}

export async function writeSetupAudit(
  admin: SupabaseClient,
  adminUserId: string,
  action: string,
  requestId: string,
  metadata: Record<string, unknown>
) {
  const { error } = await admin.from("audit_logs").insert({
    admin_user_id: adminUserId,
    action,
    target_type: "setup_assistance_request",
    target_id: requestId,
    metadata: { ...metadata, recorded_at: new Date().toISOString() },
  });

  if (error) throw error;
}

export async function startSetupSession(admin: SupabaseClient, superadminUserId: string, requestIdInput: unknown) {
  const requestId = assertUuid(requestIdInput, "setup request ID");

  const { data: request, error: requestError } = await admin
    .from("setup_assistance_requests")
    .select("id, business_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) throw requestError;
  if (!request) throw new SetupAccessError("Setup request not found.", 404);
  if (!EDITABLE_SETUP_STATUSES.includes(request.status)) {
    throw new SetupAccessError("Business setup can only be opened for Accepted or Changes Requested setup requests.", 403);
  }

  const nowIso = new Date().toISOString();
  const { data: superseded, error: supersedeError } = await admin
    .from("setup_sessions")
    .update({ revoked_at: nowIso, revoked_by: superadminUserId, revoke_reason: "superseded" })
    .eq("setup_request_id", requestId)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .select("id");

  if (supersedeError) throw supersedeError;

  const { data: session, error: insertError } = await admin
    .from("setup_sessions")
    .insert({
      setup_request_id: requestId,
      business_id: request.business_id,
      superadmin_user_id: superadminUserId,
    })
    .select(SESSION_COLUMNS)
    .single();

  if (insertError) throw insertError;

  await writeSetupAudit(admin, superadminUserId, "setup_session.started", requestId, {
    business_id: request.business_id,
    session_id: session.id,
    started_at: session.started_at,
    expires_at: session.expires_at,
    superseded_session_ids: (superseded || []).map((row: { id: string }) => row.id),
  });

  return toContext(session as SessionRow);
}

export async function requireSetupSession(
  admin: SupabaseClient,
  superadminUserId: string,
  sessionIdInput: unknown
): Promise<SetupSessionContext> {
  const sessionId = assertUuid(sessionIdInput, "setup session ID");

  const { data: session, error: sessionError } = await admin
    .from("setup_sessions")
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) throw new SetupAccessError("Setup session not found.", 404);
  if (session.superadmin_user_id !== superadminUserId) {
    throw new SetupAccessError("This setup session belongs to another Superadmin.", 403);
  }
  if (session.revoked_at) throw new SetupAccessError("This setup session has been revoked.", 403);
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    throw new SetupAccessError("This setup session has expired.", 403);
  }

  const { data: request, error: requestError } = await admin
    .from("setup_assistance_requests")
    .select("id, business_id, status")
    .eq("id", session.setup_request_id)
    .maybeSingle();

  if (requestError) throw requestError;
  if (!request || request.business_id !== session.business_id) {
    throw new SetupAccessError("Setup session is not bound to a valid setup request.", 403);
  }
  if (!EDITABLE_SETUP_STATUSES.includes(request.status)) {
    throw new SetupAccessError("This setup request is no longer open for setup changes.", 403);
  }

  await admin.from("setup_sessions").update({ last_used_at: new Date().toISOString() }).eq("id", sessionId);

  return toContext(session as SessionRow);
}

export async function revokeSetupSession(
  admin: SupabaseClient,
  superadminUserId: string,
  sessionIdInput: unknown,
  reason = "revoked_by_superadmin"
) {
  const sessionId = assertUuid(sessionIdInput, "setup session ID");

  const { data: session, error: sessionError } = await admin
    .from("setup_sessions")
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) throw new SetupAccessError("Setup session not found.", 404);
  if (session.revoked_at) return { alreadyRevoked: true };

  const safeReason = reason.slice(0, 120);
  const revokedAt = new Date().toISOString();

  const { error: revokeError } = await admin
    .from("setup_sessions")
    .update({ revoked_at: revokedAt, revoked_by: superadminUserId, revoke_reason: safeReason })
    .eq("id", sessionId)
    .is("revoked_at", null);

  if (revokeError) throw revokeError;

  await writeSetupAudit(admin, superadminUserId, "setup_session.revoked", session.setup_request_id, {
    business_id: session.business_id,
    session_id: session.id,
    session_owner_user_id: session.superadmin_user_id,
    revoked_at: revokedAt,
    reason: safeReason,
  });

  return { alreadyRevoked: false };
}

export async function listActiveSetupSessions(admin: SupabaseClient, requestIds: string[]) {
  const sessions = new Map<string, ActiveSetupSession>();
  if (requestIds.length === 0) return sessions;

  const { data, error } = await admin
    .from("setup_sessions")
    .select("id, setup_request_id, superadmin_user_id, expires_at")
    .in("setup_request_id", requestIds)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("started_at", { ascending: false });

  if (error) throw error;

  for (const row of data || []) {
    const requestId = String(row.setup_request_id);
    if (!sessions.has(requestId)) {
      sessions.set(requestId, {
        sessionId: String(row.id),
        expiresAt: row.expires_at,
        superadminUserId: String(row.superadmin_user_id),
      });
    }
  }

  return sessions;
}