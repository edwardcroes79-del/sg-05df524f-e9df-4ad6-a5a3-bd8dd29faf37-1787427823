import type { SupabaseClient } from "@supabase/supabase-js";

export type OverdueInvoiceRecord = {
  invoiceId: string;
  businessId: string;
  businessName: string;
  businessAdmin: string;
  invoiceNumber: string;
  dueDate: string;
  outstandingAmount: number;
  currency: string;
  status: string;
  reminderEnabled: boolean;
  dismissedToday: boolean;
  lastDismissedOn: string | null;
};

export type OverdueReminderSummary = {
  totalOverdueBusinesses: number;
  totalOverdueInvoices: number;
  remindersDismissedToday: number;
  businessesWithRemindersEnabled: number;
  globalEnabled: boolean;
  today: string;
};

const nonOverdueStatuses = new Set(["approved", "paid", "complete", "completed", "rejected", "cancelled", "canceled", "voided", "failed"]);
const dueDateKeys = ["due_date", "invoice_due_date", "payment_due_date", "dueDate", "invoiceDueDate", "paymentDueDate"];

export function getArubaLocalDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Aruba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function getInvoiceDueDate(metadata: Record<string, unknown>) {
  const value = getMetadataString(metadata, dueDateKeys);
  if (!value) return null;

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;

  return getArubaLocalDate(parsed);
}

function getInvoiceNumber(row: any, metadata: Record<string, unknown>) {
  return getMetadataString(metadata, ["invoice_number", "invoiceNumber", "invoice_id", "invoiceId"]) || row.payment_reference || row.id;
}

function isPaymentOverdue(row: any, today: string) {
  const status = String(row.status || "pending").toLowerCase();
  if (nonOverdueStatuses.has(status)) return false;
  if (row.paid_at) return false;

  const metadata = metadataObject(row.metadata);
  const dueDate = getInvoiceDueDate(metadata);
  return Boolean(dueDate && dueDate < today);
}

export async function getOverdueReminderData(admin: SupabaseClient, businessIds?: string[]) {
  const today = getArubaLocalDate();

  let query = admin
    .from("subscription_payments")
    .select(`
      id,
      business_id,
      amount,
      currency,
      status,
      paid_at,
      payment_reference,
      created_at,
      metadata,
      businesses (
        id,
        business_name,
        owner_id
      )
    `)
    .is("paid_at", null)
    .order("created_at", { ascending: false });

  if (businessIds && businessIds.length > 0) {
    query = query.in("business_id", businessIds);
  }

  const { data: payments, error: paymentsError } = await query;
  if (paymentsError) throw paymentsError;

  const overduePayments = (payments || []).filter((payment: any) => payment.business_id && isPaymentOverdue(payment, today));
  const overdueBusinessIds = Array.from(new Set(overduePayments.map((payment: any) => String(payment.business_id))));
  const ownerIds = Array.from(new Set(overduePayments.map((payment: any) => {
    const business = Array.isArray(payment.businesses) ? payment.businesses[0] : payment.businesses;
    return business?.owner_id;
  }).filter(Boolean)));

  const { data: globalSetting, error: globalError } = await admin
    .from("overdue_reminder_settings")
    .select("enabled")
    .eq("id", true)
    .maybeSingle();

  if (globalError) throw globalError;

  const { data: businessSettings, error: businessSettingsError } = overdueBusinessIds.length > 0
    ? await admin
      .from("overdue_reminder_business_settings")
      .select("business_id, enabled")
      .in("business_id", overdueBusinessIds)
    : { data: [], error: null };

  if (businessSettingsError) throw businessSettingsError;

  const { data: todayDismissals, error: todayDismissalsError } = overdueBusinessIds.length > 0
    ? await admin
      .from("overdue_reminder_dismissals")
      .select("business_id, invoice_id, dismissed_on")
      .eq("dismissed_on", today)
      .in("business_id", overdueBusinessIds)
    : { data: [], error: null };

  if (todayDismissalsError) throw todayDismissalsError;

  const { data: latestDismissals, error: latestDismissalsError } = overdueBusinessIds.length > 0
    ? await admin
      .from("overdue_reminder_dismissals")
      .select("business_id, invoice_id, dismissed_on, dismissed_at")
      .in("business_id", overdueBusinessIds)
      .order("dismissed_at", { ascending: false })
    : { data: [], error: null };

  if (latestDismissalsError) throw latestDismissalsError;

  const { data: ownerProfiles, error: ownerProfilesError } = ownerIds.length > 0
    ? await admin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ownerIds)
    : { data: [], error: null };

  if (ownerProfilesError) throw ownerProfilesError;

  const businessSettingById = new Map((businessSettings || []).map((setting: any) => [String(setting.business_id), Boolean(setting.enabled)]));
  const todayDismissalKeys = new Set((todayDismissals || []).map((dismissal: any) => `${dismissal.business_id}:${dismissal.invoice_id}`));
  const latestDismissalByInvoice = new Map<string, string>();
  const ownerProfileById = new Map((ownerProfiles || []).map((profile: any) => [String(profile.id), profile]));

  (latestDismissals || []).forEach((dismissal: any) => {
    const key = `${dismissal.business_id}:${dismissal.invoice_id}`;
    if (!latestDismissalByInvoice.has(key)) {
      latestDismissalByInvoice.set(key, dismissal.dismissed_on);
    }
  });

  const globalEnabled = globalSetting?.enabled !== false;

  const invoices: OverdueInvoiceRecord[] = overduePayments.map((payment: any) => {
    const metadata = metadataObject(payment.metadata);
    const business = Array.isArray(payment.businesses) ? payment.businesses[0] : payment.businesses;
    const ownerProfile = business?.owner_id ? ownerProfileById.get(String(business.owner_id)) : null;
    const businessId = String(payment.business_id);
    const invoiceKey = `${businessId}:${payment.id}`;

    return {
      invoiceId: payment.id,
      businessId,
      businessName: business?.business_name || String(metadata.business_name || "Unknown business"),
      businessAdmin: ownerProfile?.full_name || ownerProfile?.email || "Unknown admin",
      invoiceNumber: getInvoiceNumber(payment, metadata),
      dueDate: getInvoiceDueDate(metadata) || "",
      outstandingAmount: Number(payment.amount || 0),
      currency: payment.currency || "AWG",
      status: String(payment.status || "pending"),
      reminderEnabled: globalEnabled && businessSettingById.get(businessId) !== false,
      dismissedToday: todayDismissalKeys.has(invoiceKey),
      lastDismissedOn: latestDismissalByInvoice.get(invoiceKey) || null,
    };
  });

  const overdueBusinessIdSet = new Set(invoices.map((invoice) => invoice.businessId));
  const enabledBusinessIdSet = new Set(invoices.filter((invoice) => invoice.reminderEnabled).map((invoice) => invoice.businessId));
  const dismissedTodayBusinessInvoiceCount = invoices.filter((invoice) => invoice.dismissedToday).length;

  return {
    summary: {
      totalOverdueBusinesses: overdueBusinessIdSet.size,
      totalOverdueInvoices: invoices.length,
      remindersDismissedToday: dismissedTodayBusinessInvoiceCount,
      businessesWithRemindersEnabled: enabledBusinessIdSet.size,
      globalEnabled,
      today,
    } satisfies OverdueReminderSummary,
    invoices,
  };
}

export async function getBusinessAdminBusinessIds(admin: SupabaseClient, userId: string) {
  const { data: ownedBusinesses, error: ownedError } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId);

  if (ownedError) throw ownedError;

  const { data: memberships, error: membershipError } = await admin
    .from("business_users")
    .select("business_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "admin", "corporate_admin"]);

  if (membershipError) throw membershipError;

  return Array.from(new Set([
    ...(ownedBusinesses || []).map((business: any) => String(business.id)),
    ...(memberships || []).map((membership: any) => String(membership.business_id)).filter(Boolean),
  ]));
}