import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/server/adminAuth";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type UnconfirmedAccountType = "customer" | "business" | "general";

export type EligibilityResult = {
  accountType: UnconfirmedAccountType;
  eligible: boolean;
  blockReason: string | null;
  customerIds: string[];
  ownedBusinessIds: string[];
  blockingCounts: Record<string, number>;
};

const BUSINESS_ROLES = new Set(["owner", "business_owner", "business"]);
const ALLOWED_ROLES = new Set(["", "customer", "owner", "business_owner", "business"]);
const ALLOWED_REGISTRATION_TYPES = new Set(["", "customer", "business"]);

const USER_REFERENCES: Array<[string, string]> = [
  ["customer_loyalty_cards", "user_id"],
  ["rewards", "user_id"],
  ["rewards", "redeemed_by"],
  ["stamp_transactions", "staff_user_id"],
  ["anti_fraud_blocked_attempts", "staff_user_id"],
  ["anti_fraud_security_alerts", "staff_user_id"],
  ["anti_fraud_security_alerts", "read_by"],
  ["customer_birthdays", "registered_by_user_id"],
  ["customer_birthdays", "corrected_by_admin_user_id"],
  ["customer_birthday_corrections", "corrected_by_admin_user_id"],
  ["business_locations", "created_by"],
  ["business_locations", "updated_by"],
  ["business_user_locations", "assigned_by"],
  ["loyalty_program_locations", "created_by"],
  ["business_anti_fraud_settings", "updated_by"],
  ["business_birthday_reward_settings", "updated_by"],
  ["subscription_payments", "reviewed_by"],
  ["backup_jobs", "created_by"],
  ["restore_jobs", "performed_by"],
  ["super_admin_notification_reads", "admin_user_id"],
];

const CUSTOMER_REFERENCES: Array<[string, string]> = [
  ["customer_loyalty_cards", "customer_id"],
  ["stamp_transactions", "customer_id"],
  ["rewards", "customer_id"],
  ["reward_qr_tokens", "customer_id"],
  ["payment_transactions", "customer_id"],
  ["customer_birthdays", "customer_id"],
  ["customer_birthday_corrections", "customer_id"],
  ["birthday_reward_awards", "customer_id"],
  ["anti_fraud_security_alerts", "customer_id"],
  ["anti_fraud_blocked_attempts", "customer_id"],
];

const BUSINESS_REFERENCES: string[] = [
  "anti_fraud_blocked_attempts",
  "anti_fraud_security_alerts",
  "birthday_reward_awards",
  "business_addon_subscriptions",
  "business_anti_fraud_settings",
  "business_birthday_reward_settings",
  "business_locations",
  "business_user_locations",
  "contract_reminders",
  "customer_loyalty_cards",
  "email_logs",
  "loyalty_program_locations",
  "loyalty_programs",
  "payment_transactions",
  "qr_codes",
  "quick_stamp_qr_tokens",
  "reward_qr_tokens",
  "rewards",
  "stamp_transactions",
  "subscription_payments",
];

function text(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function countRows(
  supabase: ServiceClient,
  table: string,
  column: string,
  values: string[],
  excludeUserId?: string
) {
  if (values.length === 0) return 0;

  let query = supabase.from(table).select("*", { count: "exact", head: true }).in(column, values);
  if (excludeUserId) query = query.neq("user_id", excludeUserId);

  const { count, error } = await query;
  if (error) throw new Error(`Could not inspect ${table}.${column}: ${error.message}`);
  return count || 0;
}

function blocked(base: Omit<EligibilityResult, "eligible" | "blockReason">, reason: string): EligibilityResult {
  return { ...base, eligible: false, blockReason: reason };
}

export async function evaluateUnconfirmedUser(supabase: ServiceClient, user: User): Promise<EligibilityResult> {
  const userId = user.id;
  const metadata = user.user_metadata && typeof user.user_metadata === "object" && !Array.isArray(user.user_metadata)
    ? user.user_metadata as Record<string, unknown>
    : {};
  const metadataRole = text(metadata, "role");
  const registrationType = text(metadata, "registration_type");

  const [customersResult, profileResult, businessesResult, membershipsResult] = await Promise.all([
    supabase.from("customers").select("id").eq("user_id", userId),
    supabase.from("profiles").select("role, is_super_admin").eq("id", userId).maybeSingle(),
    supabase.from("businesses").select("*").eq("owner_id", userId),
    supabase.from("business_users").select("business_id").eq("user_id", userId),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (profileResult.error) throw profileResult.error;
  if (businessesResult.error) throw businessesResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  const customerIds = (customersResult.data || []).map((row: { id: string }) => row.id).filter(Boolean);
  const ownedBusinesses = (businessesResult.data || []) as Array<Record<string, unknown>>;
  const ownedBusinessIds = ownedBusinesses.map((row) => String(row.id)).filter(Boolean);
  const profile = profileResult.data as { role?: string | null; is_super_admin?: boolean | null } | null;
  const profileRole = (profile?.role || "").trim().toLowerCase();

  const isBusiness = ownedBusinessIds.length > 0 ||
    registrationType === "business" ||
    BUSINESS_ROLES.has(metadataRole) ||
    BUSINESS_ROLES.has(profileRole) ||
    typeof metadata.phone === "string";
  const hasCustomerEvidence = customerIds.length > 0 ||
    profileRole === "customer" ||
    metadataRole === "customer" ||
    registrationType === "customer" ||
    typeof metadata.full_name === "string";
  const accountType: UnconfirmedAccountType = isBusiness ? "business" : hasCustomerEvidence ? "customer" : "general";

  const base = { accountType, customerIds, ownedBusinessIds, blockingCounts: {} as Record<string, number> };

  if (profile?.is_super_admin) {
    return blocked(base, "Deletion blocked because this account is a Super Admin.");
  }

  if (!ALLOWED_ROLES.has(profileRole) || !ALLOWED_ROLES.has(metadataRole) || !ALLOWED_REGISTRATION_TYPES.has(registrationType)) {
    return blocked(base, "Deletion blocked because this account has an administrator, staff, or other privileged role.");
  }

  const foreignMemberships = (membershipsResult.data || []).filter(
    (row: { business_id: string }) => !ownedBusinessIds.includes(row.business_id)
  );

  if (foreignMemberships.length > 0) {
    return blocked(base, "Deletion blocked because this account is a staff member of a business.");
  }

  const activeBusiness = ownedBusinesses.find((row) => {
    const status = typeof row.status === "string" ? row.status.toLowerCase() : "";
    const subscriptionStatus = typeof row.subscription_status === "string" ? row.subscription_status.toLowerCase() : "";
    return Boolean(row.approved_at) || status === "active" || status === "approved" || subscriptionStatus === "active";
  });

  if (activeBusiness) {
    return blocked(base, "Deletion blocked because this account owns an approved or active business.");
  }

  const checks: Array<Promise<[string, number]>> = [
    ...USER_REFERENCES.map(async ([table, column]): Promise<[string, number]> => [
      `${table}.${column}`,
      await countRows(supabase, table, column, [userId]),
    ]),
    ...CUSTOMER_REFERENCES.map(async ([table, column]): Promise<[string, number]> => [
      `${table}.${column}`,
      await countRows(supabase, table, column, customerIds),
    ]),
    ...BUSINESS_REFERENCES.map(async (table): Promise<[string, number]> => [
      `${table}.business_id`,
      await countRows(supabase, table, "business_id", ownedBusinessIds),
    ]),
    (async (): Promise<[string, number]> => [
      "business_users.other_members",
      await countRows(supabase, "business_users", "business_id", ownedBusinessIds, userId),
    ])(),
  ];

  const results = await Promise.all(checks);
  const blockingCounts = Object.fromEntries(results.filter(([, count]) => count > 0));

  if (Object.keys(blockingCounts).length > 0) {
    const label = accountType === "business"
      ? "business data (programs, cards, staff, customers, stamps, rewards, subscriptions, payments, or settings)"
      : "loyalty, reward, payment, or administrative activity";
    return blocked({ ...base, blockingCounts }, `Deletion blocked because this account has ${label} that must be preserved.`);
  }

  return { ...base, eligible: true, blockReason: null };
}