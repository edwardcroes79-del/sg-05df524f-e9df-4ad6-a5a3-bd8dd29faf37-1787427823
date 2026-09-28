import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

type ReminderType = "30_days" | "14_days" | "7_days" | "1_day" | "expiration";
type RecipientType = "business_admin" | "super_admin";

interface BusinessContractRow {
  id: string;
  business_name: string;
  email: string | null;
  owner_id: string;
  status: string | null;
  contract_end_date: string;
  contract_status: string | null;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const reminderLabels: Record<ReminderType, string> = {
  "30_days": "30 days before expiration",
  "14_days": "14 days before expiration",
  "7_days": "7 days before expiration",
  "1_day": "1 day before expiration",
  "expiration": "on expiration",
};

const reminderSubjects: Record<ReminderType, string> = {
  "30_days": "Royalty Stamp contract expires in 30 days",
  "14_days": "Royalty Stamp contract expires in 14 days",
  "7_days": "Royalty Stamp contract expires in 7 days",
  "1_day": "Royalty Stamp contract expires tomorrow",
  "expiration": "Royalty Stamp contract has expired",
};

function getArubaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Aruba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseDateUtc(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysUntilDate(today: string, targetDate: string) {
  return Math.round((parseDateUtc(targetDate) - parseDateUtc(today)) / 86_400_000);
}

function getReminderType(daysUntil: number): ReminderType | null {
  if (daysUntil === 30) return "30_days";
  if (daysUntil === 14) return "14_days";
  if (daysUntil === 7) return "7_days";
  if (daysUntil === 1) return "1_day";
  if (daysUntil <= 0) return "expiration";
  return null;
}

function getMailPassword() {
  let mailPassword = process.env.MAIL_PASSWORD;

  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/^MAIL_PASSWORD=(.*)$/m);
      if (match) {
        let rawPass = match[1].trim();
        if ((rawPass.startsWith("\"") && rawPass.endsWith("\"")) || (rawPass.startsWith("'") && rawPass.endsWith("'"))) {
          rawPass = rawPass.slice(1, -1);
        }
        mailPassword = rawPass;
      }
    }
  } catch {
    return mailPassword;
  }

  return mailPassword;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.titan.email",
    port: Number(process.env.MAIL_PORT) || 465,
    secure: process.env.MAIL_ENCRYPTION === "ssl" || Number(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: getMailPassword(),
    },
  });
}

function buildEmailHtml(businessName: string, contractEndDate: string, reminderType: ReminderType, recipientType: RecipientType) {
  const isExpired = reminderType === "expiration";
  const dashboardUrl = recipientType === "super_admin" ? "https://royaltystamp.com/admin" : "https://royaltystamp.com/dashboard";
  const actionText = recipientType === "super_admin" ? "Review in Super Admin" : "Open Business Dashboard";

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
      <h2 style="color: #fb7185; margin-top: 0;">${isExpired ? "Contract Expired" : "Contract Expiration Reminder"}</h2>
      <p style="font-size: 16px; line-height: 1.5;">
        ${isExpired ? "The Royalty Stamp contract for" : "The Royalty Stamp contract for"} <strong>${businessName}</strong>
        ${isExpired ? "has expired." : `expires ${reminderLabels[reminderType]}.`}
      </p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0;"><strong>Business:</strong> ${businessName}</p>
        <p style="margin: 0 0 8px 0;"><strong>Contract End Date:</strong> ${contractEndDate}</p>
        <p style="margin: 0;"><strong>Reminder:</strong> ${reminderLabels[reminderType]}</p>
      </div>
      <p style="font-size: 16px; line-height: 1.5;">
        ${recipientType === "super_admin" ? "Please contact the business or renew the contract from Super Admin if appropriate." : "Please contact Royalty Stamp to renew your contract."}
      </p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${dashboardUrl}" style="background-color: #fb7185; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">${actionText}</a>
      </div>
      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;" />
      <p style="font-size: 12px; color: #64748b; text-align: center;">
        <strong>Royalty Stamp</strong><br/>
        Digital Loyalty for Your Business
      </p>
    </div>
  `;
}

async function getBusinessAdminEmail(business: BusinessContractRow) {
  if (business.email) return business.email;

  const { data } = await supabase.auth.admin.getUserById(business.owner_id);
  return data.user?.email || null;
}

async function reserveReminder(business: BusinessContractRow, reminderType: ReminderType, recipientType: RecipientType, recipientEmail: string) {
  const { data, error } = await (supabase as any)
    .from("contract_reminders")
    .insert({
      business_id: business.id,
      contract_end_date: business.contract_end_date,
      reminder_type: reminderType,
      recipient_type: recipientType,
      recipient_email: recipientEmail,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }

  return data?.id as string | undefined;
}

async function createEmailLog(business: BusinessContractRow, reminderType: ReminderType, recipientType: RecipientType, recipientEmail: string) {
  const emailType = `contract_${recipientType}_${reminderType}_${business.contract_end_date}`;

  const { data: existingLog } = await supabase
    .from("email_logs")
    .select("id, attempt_count")
    .eq("business_id", business.id)
    .eq("email_type", emailType)
    .maybeSingle();

  if (existingLog) {
    await supabase
      .from("email_logs")
      .update({
        recipient: recipientEmail,
        status: "pending",
        error_message: null,
        attempt_count: (existingLog.attempt_count || 1) + 1,
      })
      .eq("id", existingLog.id);

    return existingLog.id as string;
  }

  const { data, error } = await supabase
    .from("email_logs")
    .insert({
      business_id: business.id,
      email_type: emailType,
      recipient: recipientEmail,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function sendTrackedReminder(
  transporter: nodemailer.Transporter,
  business: BusinessContractRow,
  reminderType: ReminderType,
  recipientType: RecipientType,
  recipientEmail: string
) {
  const reminderId = await reserveReminder(business, reminderType, recipientType, recipientEmail);
  if (!reminderId) {
    return { skipped: true };
  }

  let emailLogId: string | null = null;

  try {
    emailLogId = await createEmailLog(business, reminderType, recipientType, recipientEmail);

    await (supabase as any)
      .from("contract_reminders")
      .update({ email_log_id: emailLogId, updated_at: new Date().toISOString() })
      .eq("id", reminderId);

    const senderName = process.env.MAIL_FROM_NAME || "Royalty Stamp";
    const senderEmail = process.env.MAIL_FROM_ADDRESS || "mail@royaltystamp.com";

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: recipientEmail,
      subject: reminderSubjects[reminderType],
      html: buildEmailHtml(business.business_name, business.contract_end_date, reminderType, recipientType),
    });

    const sentAt = new Date().toISOString();

    await Promise.all([
      supabase.from("email_logs").update({ status: "sent", sent_at: sentAt }).eq("id", emailLogId),
      (supabase as any).from("contract_reminders").update({ status: "sent", sent_at: sentAt, updated_at: sentAt }).eq("id", reminderId),
      supabase.from("audit_logs").insert({
        action: "contract_reminder_sent",
        target_type: "business",
        target_id: business.id,
        metadata: {
          business_name: business.business_name,
          contract_end_date: business.contract_end_date,
          reminder_type: reminderType,
          recipient_type: recipientType,
          recipient_email: recipientEmail,
        },
      }),
    ]);

    return { sent: true };
  } catch (error: any) {
    const message = error.message || "Unknown reminder email error";

    await Promise.all([
      emailLogId ? supabase.from("email_logs").update({ status: "failed", error_message: message }).eq("id", emailLogId) : Promise.resolve(),
      (supabase as any).from("contract_reminders").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() }).eq("id", reminderId),
    ]);

    return { failed: true, error: message };
  }
}

function isAuthorizedCronRequest(req: NextApiRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || "";
  const hasSecret = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isVercelCron = req.headers["x-vercel-cron"] === "1";

  if (cronSecret) return hasSecret;
  return isVercelCron || process.env.NODE_ENV !== "production";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await (supabase as any).rpc("refresh_expired_business_contracts");

    const today = getArubaDateString();
    const { data: businesses, error } = await supabase
      .from("businesses")
      .select("id, business_name, email, owner_id, status, contract_end_date, contract_status")
      .not("contract_end_date", "is", null)
      .in("contract_status", ["active", "expiring", "expired"]);

    if (error) throw error;

    const transporter = createTransporter();
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "297plugins@gmail.com";
    const summary = {
      today,
      checked: businesses?.length || 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      failures: [] as Array<{ businessId: string; recipientType: RecipientType; error: string }>,
    };

    for (const business of (businesses || []) as BusinessContractRow[]) {
      const daysUntil = daysUntilDate(today, business.contract_end_date);
      const reminderType = getReminderType(daysUntil);

      if (!reminderType) continue;

      const recipients: Array<{ type: RecipientType; email: string | null }> = [
        { type: "business_admin", email: await getBusinessAdminEmail(business) },
        { type: "super_admin", email: superAdminEmail },
      ];

      for (const recipient of recipients) {
        if (!recipient.email) {
          summary.failed += 1;
          summary.failures.push({ businessId: business.id, recipientType: recipient.type, error: "Missing recipient email" });
          continue;
        }

        const result = await sendTrackedReminder(transporter, business, reminderType, recipient.type, recipient.email);

        if (result.sent) summary.sent += 1;
        if (result.skipped) summary.skipped += 1;
        if (result.failed) {
          summary.failed += 1;
          summary.failures.push({ businessId: business.id, recipientType: recipient.type, error: result.error || "Unknown error" });
        }
      }
    }

    return res.status(200).json({ success: true, ...summary });
  } catch (error: any) {
    console.error("Contract reminder processor error:", error);
    return res.status(500).json({ error: error.message || "Failed to process contract reminders" });
  }
}