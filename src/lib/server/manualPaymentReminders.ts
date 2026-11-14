import type { SupabaseClient } from "@supabase/supabase-js";

const payableStatuses = new Set(["pending", "submitted", "reviewing", "overdue", "past_due", "unpaid", "payment_due"]);
const settledStatuses = new Set(["approved", "paid", "complete", "completed", "rejected", "cancelled", "canceled", "voided", "failed"]);

type ManualReminderPaymentContext = {
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string;
  outstandingBalance: number;
  currency: string;
  dueDate: string | null;
};

export type ManualReminderBusinessOption = {
  businessId: string;
  businessName: string;
  businessAdmin: string;
  recipientUserId: string | null;
  contractStatus: string;
  subscriptionPlan: string;
  invoiceStatus: string;
  outstandingBalance: number;
  currency: string;
  eligible: boolean;
  reason: string;
  latestInvoiceId: string | null;
  latestInvoiceNumber: string | null;
  latestDueDate: string | null;
};

export type ManualReminderHistoryRecord = {
  id: string;
  reminderType: "Manual";
  businessName: string;
  recipientAdministrator: string;
  message: string;
  sentAt: string;
  displayedAt: string | null;
  dismissedAt: string | null;
  deliveryStatus: "Dismissed" | "Displayed" | "Sent";
  sentBy: string;
  invoiceNumber: string | null;
  outstandingAmount: number | null;
  currency: string | null;
  amountDue: number | null;
  billingPeriod: string | null;
  paymentDueDate: string | null;
  referenceNote: string | null;
};

export type ManualPaymentReminderDetails = {
  amountDue?: number | null;
  billingPeriod?: string | null;
  paymentDueDate?: string | null;
  referenceNote?: string | null;
};

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function metadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function getPaymentContext(payments: any[]): ManualReminderPaymentContext {
  const openPayments = payments
    .filter((payment) => {
      const status = String(payment.status || "pending").toLowerCase();
      return !payment.paid_at && !settledStatuses.has(status) && Number(payment.amount || 0) > 0;
    })
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const outstandingBalance = openPayments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const latestPayment = openPayments[0] || null;
  const metadata = metadataObject(latestPayment?.metadata);

  return {
    invoiceId: latestPayment?.id || null,
    invoiceNumber: latestPayment ? metadataString(metadata, ["invoice_number", "invoiceNumber", "invoice_id", "invoiceId"]) || latestPayment.payment_reference || latestPayment.id : null,
    invoiceStatus: latestPayment ? String(latestPayment.status || "pending") : "none",
    outstandingBalance,
    currency: latestPayment?.currency || "AWG",
    dueDate: metadataString(metadata, ["due_date", "invoice_due_date", "payment_due_date", "dueDate", "invoiceDueDate", "paymentDueDate"]),
  };
}

function sanitizeManualPaymentDetails(details: ManualPaymentReminderDetails = {}) {
  const amountDue = details.amountDue === null || details.amountDue === undefined || details.amountDue === ""
    ? null
    : Number(details.amountDue);
  const billingPeriod = typeof details.billingPeriod === "string" && details.billingPeriod.trim() ? details.billingPeriod.trim().slice(0, 120) : null;
  const paymentDueDate = typeof details.paymentDueDate === "string" && details.paymentDueDate.trim() ? details.paymentDueDate.trim().slice(0, 40) : null;
  const referenceNote = typeof details.referenceNote === "string" && details.referenceNote.trim() ? details.referenceNote.trim().slice(0, 500) : null;

  if (amountDue !== null && (!Number.isFinite(amountDue) || amountDue < 0)) {
    throw new Error("Manual amount due must be a valid non-negative AWG amount.");
  }

  return {
    amountDue,
    billingPeriod,
    paymentDueDate,
    referenceNote,
  };
}

function isDocumentedOutstandingBusiness(business: any, paymentContext: ManualReminderPaymentContext) {
  const subscriptionStatus = String(business.subscription_status || "").toLowerCase();
  const invoiceStatus = String(paymentContext.invoiceStatus || "").toLowerCase();

  if (paymentContext.outstandingBalance > 0 && payableStatuses.has(invoiceStatus)) return true;
  return payableStatuses.has(subscriptionStatus);
}

export async function getManualReminderAdminData(admin: SupabaseClient) {
  const [
    businessesResult,
    profilesResult,
    paymentsResult,
    historyResult,
  ] = await Promise.all([
    admin
      .from("businesses")
      .select("id, business_name, owner_id, subscription_plan, subscription_status, contract_status, contract_end_date, created_at")
      .order("business_name", { ascending: true }),
    admin
      .from("profiles")
      .select("id, email, full_name"),
    admin
      .from("subscription_payments")
      .select("id, business_id, amount, currency, status, paid_at, payment_reference, metadata, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("manual_payment_reminders")
      .select(`
        id,
        business_id,
        recipient_user_id,
        message,
        sent_by,
        sent_at,
        displayed_at,
        dismissed_at,
        metadata,
        businesses ( business_name )
      `)
      .order("sent_at", { ascending: false })
      .limit(100),
  ]);

  if (businessesResult.error) throw businessesResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (paymentsResult.error) throw paymentsResult.error;
  if (historyResult.error) throw historyResult.error;

  const profileById = new Map((profilesResult.data || []).map((profile: any) => [String(profile.id), profile]));
  const paymentsByBusiness = new Map<string, any[]>();

  (paymentsResult.data || []).forEach((payment: any) => {
    if (!payment.business_id) return;
    const businessId = String(payment.business_id);
    paymentsByBusiness.set(businessId, [...(paymentsByBusiness.get(businessId) || []), payment]);
  });

  const businesses: ManualReminderBusinessOption[] = (businessesResult.data || []).map((business: any) => {
    const ownerProfile = business.owner_id ? profileById.get(String(business.owner_id)) : null;
    const paymentContext = getPaymentContext(paymentsByBusiness.get(String(business.id)) || []);
    const hasAdministrator = Boolean(business.owner_id);

    return {
      businessId: String(business.id),
      businessName: business.business_name || "Unknown business",
      businessAdmin: ownerProfile?.full_name || ownerProfile?.email || "Unknown admin",
      recipientUserId: business.owner_id || null,
      contractStatus: business.contract_status || "unassigned",
      subscriptionPlan: business.subscription_plan || "unassigned",
      invoiceStatus: paymentContext.invoiceStatus,
      outstandingBalance: paymentContext.outstandingBalance,
      currency: paymentContext.currency,
      eligible: hasAdministrator,
      reason: hasAdministrator
        ? "Manual reminders can be sent to this business. Invoice and contract records are optional for manual reminders."
        : "Selected business has no administrator user to receive this reminder.",
      latestInvoiceId: paymentContext.invoiceId,
      latestInvoiceNumber: paymentContext.invoiceNumber,
      latestDueDate: paymentContext.dueDate,
    };
  });

  const history: ManualReminderHistoryRecord[] = (historyResult.data || []).map((reminder: any) => {
    const business = Array.isArray(reminder.businesses) ? reminder.businesses[0] : reminder.businesses;
    const sender = reminder.sent_by ? profileById.get(String(reminder.sent_by)) : null;
    const metadata = metadataObject(reminder.metadata);

    return {
      id: reminder.id,
      reminderType: "Manual",
      businessName: business?.business_name || "Unknown business",
      recipientAdministrator: reminder.recipient_user_id ? profileById.get(String(reminder.recipient_user_id))?.full_name || profileById.get(String(reminder.recipient_user_id))?.email || "Business administrator" : "Business administrator",
      message: reminder.message,
      sentAt: reminder.sent_at,
      displayedAt: reminder.displayed_at,
      dismissedAt: reminder.dismissed_at,
      deliveryStatus: reminder.dismissed_at ? "Dismissed" : reminder.displayed_at ? "Displayed" : "Sent",
      sentBy: sender?.full_name || sender?.email || "Superadmin",
      invoiceNumber: typeof metadata.invoice_number === "string" ? metadata.invoice_number : null,
      outstandingAmount: typeof metadata.outstanding_amount === "number" ? metadata.outstanding_amount : null,
      currency: typeof metadata.currency === "string" ? metadata.currency : null,
      amountDue: typeof metadata.manual_amount_due === "number" ? metadata.manual_amount_due : null,
      billingPeriod: typeof metadata.billing_period === "string" ? metadata.billing_period : null,
      paymentDueDate: typeof metadata.manual_due_date === "string" ? metadata.manual_due_date : null,
      referenceNote: typeof metadata.reference_note === "string" ? metadata.reference_note : null,
    };
  });

  return { businesses, history };
}

export async function createManualPaymentReminder(
  admin: SupabaseClient,
  adminUserId: string,
  businessId: string,
  message: string,
  details: ManualPaymentReminderDetails = {}
) {
  const { businesses } = await getManualReminderAdminData(admin);
  const selectedBusiness = businesses.find((business) => business.businessId === businessId);

  if (!selectedBusiness) {
    throw new Error("Selected business was not found.");
  }

  if (!selectedBusiness.eligible) {
    throw new Error(selectedBusiness.reason);
  }

  if (!selectedBusiness.recipientUserId) {
    throw new Error("Selected business has no administrator user to receive this reminder.");
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length < 20 || trimmedMessage.length > 2000) {
    throw new Error("Reminder message must be between 20 and 2,000 characters.");
  }

  const manualDetails = sanitizeManualPaymentDetails(details);

  const { data, error } = await admin
    .from("manual_payment_reminders")
    .insert({
      business_id: businessId,
      subscription_payment_id: selectedBusiness.latestInvoiceId,
      recipient_user_id: selectedBusiness.recipientUserId,
      message: trimmedMessage,
      sent_by: adminUserId,
      sent_at: new Date().toISOString(),
      metadata: {
        reminder_type: "manual",
        invoice_number: selectedBusiness.latestInvoiceNumber,
        invoice_status: selectedBusiness.invoiceStatus,
        due_date: selectedBusiness.latestDueDate,
        outstanding_amount: selectedBusiness.outstandingBalance,
        currency: selectedBusiness.currency,
        contract_status: selectedBusiness.contractStatus,
        subscription_plan: selectedBusiness.subscriptionPlan,
        manual_amount_due: manualDetails.amountDue,
        billing_period: manualDetails.billingPeriod,
        manual_due_date: manualDetails.paymentDueDate,
        reference_note: manualDetails.referenceNote,
        source: "manual_superadmin_entry",
      },
    })
    .select("id")
    .single();

  if (error) throw error;

  await admin.from("audit_logs").insert({
    admin_user_id: adminUserId,
    action: "manual_payment_reminder_sent",
    target_type: "business",
    target_id: businessId,
    metadata: {
      reminder_id: data.id,
      invoice_id: selectedBusiness.latestInvoiceId,
      invoice_number: selectedBusiness.latestInvoiceNumber,
      outstanding_amount: selectedBusiness.outstandingBalance,
      manual_amount_due: manualDetails.amountDue,
      billing_period: manualDetails.billingPeriod,
      manual_due_date: manualDetails.paymentDueDate,
      reference_note: manualDetails.referenceNote,
      currency: selectedBusiness.currency,
    },
  });

  return data.id as string;
}

export async function getPendingManualRemindersForBusinesses(admin: SupabaseClient, userId: string, businessIds: string[]) {
  if (businessIds.length === 0) return [];

  const { data, error } = await admin
    .from("manual_payment_reminders")
    .select("id, business_id, subscription_payment_id, message, sent_at, displayed_at, dismissed_at, metadata, businesses ( business_name )")
    .in("business_id", businessIds)
    .is("dismissed_at", null)
    .or(`recipient_user_id.eq.${userId},recipient_user_id.is.null`)
    .order("sent_at", { ascending: true });

  if (error) throw error;

  const reminderIds = (data || []).filter((reminder: any) => !reminder.displayed_at).map((reminder: any) => reminder.id);

  if (reminderIds.length > 0) {
    await admin
      .from("manual_payment_reminders")
      .update({ displayed_at: new Date().toISOString() })
      .in("id", reminderIds);
  }

  return (data || []).map((reminder: any) => {
    const metadata = metadataObject(reminder.metadata);
    const business = Array.isArray(reminder.businesses) ? reminder.businesses[0] : reminder.businesses;

    return {
      id: reminder.id,
      businessId: String(reminder.business_id),
      businessName: business?.business_name || "Unknown business",
      message: reminder.message,
      sentAt: reminder.sent_at,
      invoiceId: reminder.subscription_payment_id || null,
      invoiceNumber: typeof metadata.invoice_number === "string" ? metadata.invoice_number : null,
      dueDate: typeof metadata.manual_due_date === "string" ? metadata.manual_due_date : typeof metadata.due_date === "string" ? metadata.due_date : null,
      outstandingAmount: typeof metadata.manual_amount_due === "number" ? metadata.manual_amount_due : typeof metadata.outstanding_amount === "number" ? metadata.outstanding_amount : null,
      currency: typeof metadata.currency === "string" ? metadata.currency : "AWG",
      billingPeriod: typeof metadata.billing_period === "string" ? metadata.billing_period : null,
      referenceNote: typeof metadata.reference_note === "string" ? metadata.reference_note : null,
      status: "Payment reminder",
    };
  });
}

export async function dismissManualReminder(admin: SupabaseClient, userId: string, businessIds: string[], reminderId: string) {
  const { data: reminder, error: readError } = await admin
    .from("manual_payment_reminders")
    .select("id, business_id, recipient_user_id, displayed_at, dismissed_at")
    .eq("id", reminderId)
    .maybeSingle();

  if (readError) throw readError;
  if (!reminder || reminder.dismissed_at) {
    throw new Error("Manual reminder was not found or was already dismissed.");
  }

  if (!businessIds.includes(String(reminder.business_id))) {
    throw new Error("You are not authorized to dismiss this manual reminder.");
  }

  if (reminder.recipient_user_id && String(reminder.recipient_user_id) !== userId) {
    throw new Error("This manual reminder was sent to another administrator.");
  }

  const { error } = await admin
    .from("manual_payment_reminders")
    .update({
      displayed_at: reminder.displayed_at || new Date().toISOString(),
      dismissed_at: new Date().toISOString(),
    })
    .eq("id", reminderId);

  if (error) throw error;
}