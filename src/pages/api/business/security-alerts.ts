import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ApiResponse = {
  alerts?: SecurityAlertResponse[];
  unreadCount?: number;
  alert?: Pick<SecurityAlertResponse, "id" | "readAt" | "status">;
  error?: string;
};

type SecurityAlertRow = {
  id: string;
  business_id: string;
  loyalty_program_id: string;
  customer_id: string;
  loyalty_card_id: string | null;
  staff_user_id: string | null;
  staff_group_key: string;
  cooldown_started_at: string;
  cooldown_expires_at: string;
  first_attempt_at: string;
  latest_attempt_at: string;
  attempt_count: number;
  reason: string;
  status: string;
  read_at: string | null;
  created_at: string;
};

type SecurityAlertResponse = {
  id: string;
  businessId: string;
  loyaltyProgramId: string;
  customerId: string;
  loyaltyCardId: string | null;
  staffUserId: string | null;
  staffName: string;
  staffEmail: string | null;
  staffIdentifier: string;
  memberName: string;
  memberIdentifier: string;
  programName: string;
  cooldownStartedAt: string;
  cooldownExpiresAt: string;
  firstAttemptAt: string;
  latestAttemptAt: string;
  attemptCount: number;
  reason: string;
  status: string;
  readAt: string | null;
  createdAt: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function getBearerToken(req: NextApiRequest) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    throw new Error("Missing authorization token");
  }

  return header.slice("Bearer ".length);
}

function createAdminClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function createUserClient(token: string) {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function getAuthenticatedUserId(req: NextApiRequest) {
  const token = getBearerToken(req);
  const userClient = createUserClient(token);
  const { data, error } = await userClient.auth.getUser();

  if (error || !data.user?.id) {
    throw new Error("Invalid authorization token");
  }

  return data.user.id;
}

async function canManageBusiness(admin: SupabaseClient, businessId: string, userId: string) {
  const [profileResult, businessResult, roleResult] = await Promise.all([
    admin
      .from("profiles")
      .select("is_super_admin")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("businesses")
      .select("owner_id")
      .eq("id", businessId)
      .maybeSingle(),
    admin
      .from("business_users")
      .select("role, status")
      .eq("business_id", businessId)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["owner", "admin", "corporate_admin"])
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error("Unable to verify user permissions");
  }

  if (profileResult.data?.is_super_admin) return true;

  if (businessResult.error) {
    throw new Error("Unable to verify business permissions");
  }

  if (businessResult.data?.owner_id === userId) return true;

  if (roleResult.error) {
    throw new Error("Unable to verify business role");
  }

  return Boolean(roleResult.data);
}

function normalizeId(value: string | string[] | undefined, fieldName: string) {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id || typeof id !== "string") {
    throw new Error(`${fieldName} is required`);
  }

  return id;
}

function mapById<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

type StaffAuthIdentity = {
  id: string;
  fullName: string | null;
  email: string | null;
};

async function loadAlertDetails(admin: SupabaseClient, alerts: SecurityAlertRow[]) {
  const businessIds = [...new Set(alerts.map((alert) => alert.business_id).filter(Boolean))];
  const customerIds = [...new Set(alerts.map((alert) => alert.customer_id).filter(Boolean))];
  const programIds = [...new Set(alerts.map((alert) => alert.loyalty_program_id).filter(Boolean))];
  const staffIds = [...new Set(alerts.map((alert) => alert.staff_user_id).filter(Boolean))] as string[];

  const [
    { data: customers },
    { data: programs },
    { data: staffProfiles },
    { data: staffMemberships },
    { data: businesses },
  ] = await Promise.all([
    customerIds.length
      ? admin.from("customers").select("id, name, email, phone").in("id", customerIds)
      : Promise.resolve({ data: [] }),
    programIds.length
      ? admin.from("loyalty_programs").select("id, name").in("id", programIds)
      : Promise.resolve({ data: [] }),
    staffIds.length
      ? admin.from("profiles").select("id, full_name, email").in("id", staffIds)
      : Promise.resolve({ data: [] }),
    staffIds.length && businessIds.length
      ? admin
          .from("business_users")
          .select("business_id, user_id, status")
          .in("business_id", businessIds)
          .in("user_id", staffIds)
      : Promise.resolve({ data: [] }),
    businessIds.length
      ? admin.from("businesses").select("id, owner_id").in("id", businessIds)
      : Promise.resolve({ data: [] }),
  ]);

  const customersById = mapById((customers || []) as Array<{ id: string; name: string | null; email: string | null; phone: string | null }>);
  const programsById = mapById((programs || []) as Array<{ id: string; name: string | null }>);
  const staffById = mapById((staffProfiles || []) as Array<{ id: string; full_name: string | null; email: string | null }>);
  const businessesById = mapById((businesses || []) as Array<{ id: string; owner_id: string | null }>);
  const staffMembershipKeys = new Set(
    ((staffMemberships || []) as Array<{ business_id: string; user_id: string | null; status: string | null }>)
      .filter((membership) => membership.user_id && membership.status === "active")
      .map((membership) => `${membership.business_id}:${membership.user_id}`)
  );

  const allowedStaffIds = staffIds.filter((staffId) => alerts.some((alert) => {
    const business = businessesById.get(alert.business_id);

    return alert.staff_user_id === staffId && (
      business?.owner_id === staffId ||
      staffMembershipKeys.has(`${alert.business_id}:${staffId}`)
    );
  }));

  const staffNeedingAuthLookup = allowedStaffIds.filter((staffId) => {
    const profile = staffById.get(staffId);
    return !(profile?.full_name?.trim() && profile?.email?.trim());
  });

  const authIdentities = await Promise.all(
    staffNeedingAuthLookup.map(async (staffId): Promise<StaffAuthIdentity | null> => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(staffId);

        if (error || !data.user) {
          return null;
        }

        const metadata = data.user.user_metadata as Record<string, unknown> | null;
        const metadataFullName = typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "";
        const metadataName = typeof metadata?.name === "string" ? metadata.name.trim() : "";

        return {
          id: staffId,
          fullName: metadataFullName || metadataName || null,
          email: data.user.email?.trim() || null,
        };
      } catch {
        return null;
      }
    })
  );
  const staffAuthById = mapById(authIdentities.filter(Boolean) as StaffAuthIdentity[]);

  return alerts.map((alert) => {
    const customer = customersById.get(alert.customer_id);
    const program = programsById.get(alert.loyalty_program_id);
    const staff = alert.staff_user_id ? staffById.get(alert.staff_user_id) : null;
    const staffAuth = alert.staff_user_id ? staffAuthById.get(alert.staff_user_id) : null;
    const business = businessesById.get(alert.business_id);
    const staffBelongsToBusiness = Boolean(
      alert.staff_user_id &&
      (
        business?.owner_id === alert.staff_user_id ||
        staffMembershipKeys.has(`${alert.business_id}:${alert.staff_user_id}`)
      )
    );
    const staffFullName = staffBelongsToBusiness ? staff?.full_name?.trim() || staffAuth?.fullName || null : null;
    const staffEmail = staffBelongsToBusiness ? staff?.email?.trim() || staffAuth?.email || null : null;
    const staffDisplayName = staffFullName || staffEmail || "Staff identity unavailable";

    return {
      id: alert.id,
      businessId: alert.business_id,
      loyaltyProgramId: alert.loyalty_program_id,
      customerId: alert.customer_id,
      loyaltyCardId: alert.loyalty_card_id,
      staffUserId: alert.staff_user_id,
      staffName: staffDisplayName,
      staffEmail,
      staffIdentifier: staffEmail || staffFullName || "Staff identity unavailable",
      memberName: customer?.name || "Unknown member",
      memberIdentifier: customer?.email || customer?.phone || alert.customer_id,
      programName: program?.name || "Unknown loyalty program",
      cooldownStartedAt: alert.cooldown_started_at,
      cooldownExpiresAt: alert.cooldown_expires_at,
      firstAttemptAt: alert.first_attempt_at,
      latestAttemptAt: alert.latest_attempt_at,
      attemptCount: Number(alert.attempt_count || 0),
      reason: alert.reason,
      status: alert.status,
      readAt: alert.read_at,
      createdAt: alert.created_at,
    };
  });
}

async function listAlerts(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const businessId = normalizeId(req.query.businessId, "businessId");
  const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
  const admin = createAdminClient();
  const userId = await getAuthenticatedUserId(req);

  if (!(await canManageBusiness(admin, businessId, userId))) {
    return res.status(403).json({ error: "Only a Business Owner/Admin can access security alerts" });
  }

  if (req.query.summary === "1") {
    const { count: unreadOnlyCount, error: unreadOnlyError } = await admin
      .from("anti_fraud_security_alerts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("read_at", null);

    if (unreadOnlyError) {
      return res.status(500).json({ error: "Unable to load security alerts" });
    }

    return res.status(200).json({ unreadCount: Number(unreadOnlyCount || 0) });
  }

  const [{ data: alerts, error: alertsError }, { count, error: countError }] = await Promise.all([
    admin
      .from("anti_fraud_security_alerts")
      .select("*")
      .eq("business_id", businessId)
      .order("latest_attempt_at", { ascending: false })
      .limit(limit),
    admin
      .from("anti_fraud_security_alerts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("read_at", null),
  ]);

  if (alertsError || countError) {
    return res.status(500).json({ error: "Unable to load security alerts" });
  }

  const hydratedAlerts = await loadAlertDetails(admin, (alerts || []) as SecurityAlertRow[]);

  return res.status(200).json({
    alerts: hydratedAlerts,
    unreadCount: Number(count || 0),
  });
}

async function markAlertRead(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { businessId, alertId } = req.body || {};

  if (!businessId || !alertId) {
    return res.status(400).json({ error: "businessId and alertId are required" });
  }

  const admin = createAdminClient();
  const userId = await getAuthenticatedUserId(req);

  if (!(await canManageBusiness(admin, businessId, userId))) {
    return res.status(403).json({ error: "Only a Business Owner/Admin can manage security alerts" });
  }

  const { data: alert, error: alertError } = await admin
    .from("anti_fraud_security_alerts")
    .select("id, business_id")
    .eq("id", alertId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (alertError) {
    return res.status(500).json({ error: "Unable to verify security alert" });
  }

  if (!alert) {
    return res.status(404).json({ error: "Security alert not found" });
  }

  const { data, error } = await admin.rpc("mark_anti_fraud_security_alert_read", {
    p_alert_id: alertId,
    p_user_id: userId,
  });

  if (error) {
    return res.status(403).json({ error: error.message || "Unable to mark security alert as read" });
  }

  const updated = Array.isArray(data) ? data[0] : data;

  return res.status(200).json({
    alert: {
      id: updated?.id || alertId,
      readAt: updated?.read_at || new Date().toISOString(),
      status: updated?.status || "reviewed",
    },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    if (req.method === "GET") {
      return await listAlerts(req, res);
    }

    if (req.method === "PATCH") {
      return await markAlertRead(req, res);
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    const message = error?.message || "Security alerts request failed";
    const status = message.includes("authorization") || message.includes("authenticated") ? 401 : 500;

    return res.status(status).json({ error: message });
  }
}