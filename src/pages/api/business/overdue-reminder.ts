import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/server/adminAuth";
import { getArubaLocalDate, getBusinessAdminBusinessIds, getOverdueReminderData } from "@/lib/server/overdueReminders";

type ApiResponse = {
  success?: boolean;
  summary?: unknown;
  invoices?: unknown[];
  error?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function requireAuthenticatedUser(req: NextApiRequest) {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase server configuration is incomplete");

  const authorization = req.headers.authorization;
  if (!authorization) throw new Error("Missing authorization header");

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authorization },
    },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");

  return data.user;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const user = await requireAuthenticatedUser(req);
    const admin = createServiceClient();
    const businessIds = await getBusinessAdminBusinessIds(admin, user.id);

    if (businessIds.length === 0) {
      return res.status(200).json({ success: true, summary: null, invoices: [] });
    }

    const data = await getOverdueReminderData(admin, businessIds);
    const visibleInvoices = data.invoices.filter((invoice) => invoice.reminderEnabled && !invoice.dismissedToday);

    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        summary: { ...data.summary, totalOverdueInvoices: visibleInvoices.length },
        invoices: visibleInvoices,
      });
    }

    if (req.method === "POST") {
      const { businessId, invoiceIds } = req.body || {};

      if (typeof businessId !== "string" || !businessIds.includes(businessId)) {
        return res.status(403).json({ error: "You are not authorized to dismiss reminders for this business." });
      }

      const authorizedInvoiceIds = new Set(
        visibleInvoices
          .filter((invoice) => invoice.businessId === businessId)
          .map((invoice) => invoice.invoiceId)
      );

      const requestedInvoiceIds = Array.isArray(invoiceIds)
        ? invoiceIds.map((invoiceId) => String(invoiceId)).filter((invoiceId) => authorizedInvoiceIds.has(invoiceId))
        : Array.from(authorizedInvoiceIds);

      if (requestedInvoiceIds.length === 0) {
        return res.status(400).json({ error: "No active overdue reminder was found for this business." });
      }

      const dismissedOn = getArubaLocalDate();
      const rows = requestedInvoiceIds.map((invoiceId) => ({
        business_id: businessId,
        invoice_id: invoiceId,
        dismissed_on: dismissedOn,
        dismissed_by: user.id,
        dismissed_at: new Date().toISOString(),
      }));

      const { error } = await admin
        .from("overdue_reminder_dismissals")
        .upsert(rows, { onConflict: "business_id,invoice_id,dismissed_on" });

      if (error) throw error;

      return res.status(200).json({ success: true, invoices: [] });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    const message = error?.message || "Business overdue reminder request failed.";
    const status = message.includes("authenticated") || message.includes("authorization") ? 401 : message.includes("authorized") ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}