import type { NextApiRequest, NextApiResponse } from "next";
import { createServiceClient, requireSuperAdmin } from "@/lib/server/adminAuth";
import { getOverdueReminderData } from "@/lib/server/overdueReminders";

type ApiResponse = {
  success?: boolean;
  summary?: unknown;
  invoices?: unknown[];
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const adminUserId = await requireSuperAdmin(req);
    const admin = createServiceClient();

    if (req.method === "GET") {
      const data = await getOverdueReminderData(admin);
      return res.status(200).json({ success: true, ...data });
    }

    if (req.method === "PATCH") {
      const { action, enabled, businessId } = req.body || {};

      if (action === "global") {
        const { error } = await admin
          .from("overdue_reminder_settings")
          .upsert({
            id: true,
            enabled: Boolean(enabled),
            updated_by: adminUserId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });

        if (error) throw error;

        await admin.from("audit_logs").insert({
          admin_user_id: adminUserId,
          action: "overdue_reminders_global_updated",
          target_type: "overdue_reminder_settings",
          target_id: "global",
          metadata: { enabled: Boolean(enabled) },
        });

        const data = await getOverdueReminderData(admin);
        return res.status(200).json({ success: true, ...data });
      }

      if (action === "business") {
        if (typeof businessId !== "string" || !businessId) {
          return res.status(400).json({ error: "A valid business ID is required." });
        }

        const { error } = await admin
          .from("overdue_reminder_business_settings")
          .upsert({
            business_id: businessId,
            enabled: Boolean(enabled),
            updated_by: adminUserId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "business_id" });

        if (error) throw error;

        await admin.from("audit_logs").insert({
          admin_user_id: adminUserId,
          action: "overdue_reminders_business_updated",
          target_type: "business",
          target_id: businessId,
          metadata: { enabled: Boolean(enabled) },
        });

        const data = await getOverdueReminderData(admin);
        return res.status(200).json({ success: true, ...data });
      }

      return res.status(400).json({ error: "Unsupported overdue reminder update action." });
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    const message = error?.message || "Overdue reminder request failed.";
    const status = message.includes("authenticated") ? 401 : message.includes("Super Admin") ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}