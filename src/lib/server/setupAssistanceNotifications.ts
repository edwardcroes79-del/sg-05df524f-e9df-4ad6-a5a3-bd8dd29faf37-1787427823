import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getConfirmationEmailOrigin, sanitizeMailError } from "@/lib/server/confirmationEmail";
import type { SetupAssistanceStatus } from "@/lib/server/setupAssistance";

type SetupEmailLogResult = {
  emailLogId: string | null;
  skipSend: boolean;
};

type SuperAdminSetupRequestEmailInput = {
  businessId: string;
  businessName: string;
  requestId: string;
  requesterEmail: string | null;
  requestedAt: string;
  origin?: string;
};

type BusinessSetupStatusEmailInput = {
  businessId: string;
  businessName: string;
  requestId: string;
  recipientEmail: string | null;
  status: SetupAssistanceStatus;
  eventDate: string;
  feedback?: string | null;
  reviewRound?: number | null;
  origin?: string;
};

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
  }

  return mailPassword;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.titan.email",
    port: parseInt(process.env.MAIL_PORT || "465", 10),
    secure: process.env.MAIL_ENCRYPTION === "ssl" || parseInt(process.env.MAIL_PORT || "465", 10) === 465,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: getMailPassword(),
    },
  });
}

function getFromAddress() {
  return {
    fromName: process.env.MAIL_FROM_NAME || "Royalty Stamp",
    fromEmail: process.env.MAIL_FROM_ADDRESS || "mail@royaltystamp.com",
  };
}

function getSuperAdminRecipient() {
  return process.env.SUPERADMIN_NOTIFICATION_EMAIL || "297plugins@gmail.com";
}

function formatArubaDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    timeZone: "America/Aruba",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getBusinessStatusCopy(status: SetupAssistanceStatus) {
  if (status === "pending") {
    return {
      subject: "Setup Assistance Request Submitted",
      message: "Your setup assistance request was submitted successfully.",
      label: "Pending",
    };
  }

  if (status === "accepted") {
    return {
      subject: "Setup Assistance Accepted",
      message: "Your request has been accepted. Our team is preparing your setup.",
      label: "Accepted",
    };
  }

  if (status === "ready_for_review") {
    return {
      subject: "Setup Draft Ready for Review",
      message: "Your loyalty card setup is ready! Please review and approve it.",
      label: "Ready for Review",
    };
  }

  if (status === "changes_requested") {
    return {
      subject: "Setup Changes Requested",
      message: "Your setup requires changes. Please review our feedback.",
      label: "Changes Requested",
    };
  }

  if (status === "completed") {
    return {
      subject: "Setup Approved and Activated",
      message: "Your loyalty card setup has been approved and activated!",
      label: "Completed",
    };
  }

  return {
    subject: "Setup Assistance Declined",
    message: "Your request was declined. Please review the explanation.",
    label: "Declined",
  };
}

async function prepareEmailLog(
  admin: SupabaseClient,
  businessId: string,
  emailType: string,
  recipient: string
): Promise<SetupEmailLogResult> {
  const { data: existingLog, error: existingLogError } = await admin
    .from("email_logs")
    .select("id, status, attempt_count")
    .eq("business_id", businessId)
    .eq("email_type", emailType)
    .eq("recipient", recipient)
    .maybeSingle();

  if (existingLogError) {
    throw existingLogError;
  }

  if (existingLog?.id) {
    if (existingLog.status === "sent") {
      return {
        emailLogId: existingLog.id,
        skipSend: true,
      };
    }

    await admin
      .from("email_logs")
      .update({
        status: "pending",
        error_message: null,
        attempt_count: Number(existingLog.attempt_count || 0) + 1,
      })
      .eq("id", existingLog.id);

    return {
      emailLogId: existingLog.id,
      skipSend: false,
    };
  }

  const { data: createdLog, error: createdLogError } = await admin
    .from("email_logs")
    .insert({
      business_id: businessId,
      email_type: emailType,
      recipient,
      status: "pending",
      attempt_count: 1,
    })
    .select("id")
    .single();

  if (createdLogError) {
    throw createdLogError;
  }

  return {
    emailLogId: createdLog?.id || null,
    skipSend: false,
  };
}

async function finalizeEmailLog(
  admin: SupabaseClient,
  emailLogId: string | null,
  status: "sent" | "failed",
  errorMessage?: string | null
) {
  if (!emailLogId) return;

  await admin
    .from("email_logs")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      error_message: status === "failed" ? errorMessage || "Unknown email provider error" : null,
    })
    .eq("id", emailLogId);
}

export async function notifySuperAdminOfSetupRequestSubmission(
  admin: SupabaseClient,
  input: SuperAdminSetupRequestEmailInput
) {
  const recipient = getSuperAdminRecipient();
  const { emailLogId, skipSend } = await prepareEmailLog(
    admin,
    input.businessId,
    `setup_assistance_superadmin_request_${input.requestId}`,
    recipient
  );

  if (skipSend) {
    return { emailSent: true, duplicateSuppressed: true };
  }

  const finalOrigin = getConfirmationEmailOrigin(input.origin);
  const adminUrl = `${finalOrigin}/admin`;
  const transporter = createTransporter();
  const { fromName, fromEmail } = getFromAddress();

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <h2 style="color: #fb7185;">New Setup Assistance Request</h2>
      <p>A Business Admin submitted a new setup assistance request.</p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0;"><strong>Business:</strong> ${escapeHtml(input.businessName)}</p>
        <p style="margin: 0 0 8px 0;"><strong>Requester Email:</strong> ${escapeHtml(input.requesterEmail || "Unavailable")}</p>
        <p style="margin: 0;"><strong>Submitted:</strong> ${escapeHtml(formatArubaDateTime(input.requestedAt))}</p>
      </div>
      <div style="margin: 30px 0;">
        <a href="${adminUrl}" style="background-color: #fb7185; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Request</a>
      </div>
      <p style="margin-bottom: 24px;">Open the Superadmin dashboard to review this request.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 16px 0;" />
      <p style="font-weight: bold; margin: 0; color: #1e293b;">Royalty Stamp</p>
      <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Digital Loyalty for Your Business</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipient,
      subject: "New Setup Assistance Request",
      html,
    });

    await finalizeEmailLog(admin, emailLogId, "sent");
    return { emailSent: true, duplicateSuppressed: false };
  } catch (error) {
    const sanitized = sanitizeMailError(error);
    await finalizeEmailLog(admin, emailLogId, "failed", sanitized);
    return { emailSent: false, duplicateSuppressed: false, error: sanitized };
  }
}

export async function notifyBusinessAdminOfSetupStatusChange(
  admin: SupabaseClient,
  input: BusinessSetupStatusEmailInput
) {
  if (!input.recipientEmail) {
    return { emailSent: false, skipped: true, error: "Missing recipient email." };
  }

  const copy = getBusinessStatusCopy(input.status);
  const roundSuffix = input.status === "ready_for_review" || input.status === "changes_requested"
    ? `_r${Math.max(1, Number(input.reviewRound || 1))}`
    : "";
  const emailType = `setup_assistance_business_${input.status}${roundSuffix}`;
  const { emailLogId, skipSend } = await prepareEmailLog(admin, input.businessId, emailType, input.recipientEmail);

  if (skipSend) {
    return { emailSent: true, duplicateSuppressed: true };
  }

  const finalOrigin = getConfirmationEmailOrigin(input.origin);
  const requestUrl = `${finalOrigin}/dashboard?setupRequest=${encodeURIComponent(input.requestId)}`;
  const transporter = createTransporter();
  const { fromName, fromEmail } = getFromAddress();
  const requestReference = input.requestId.slice(0, 8).toUpperCase();

  const feedbackBlock = input.feedback
    ? `<div style="background-color: #fff7ed; padding: 12px; border-radius: 8px; border: 1px solid #fed7aa; margin-top: 16px;">
         <p style="margin: 0 0 6px 0; font-weight: bold; color: #9a3412;">Latest Feedback</p>
         <p style="margin: 0; color: #7c2d12;">${escapeHtml(input.feedback)}</p>
       </div>`
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <h2 style="color: #fb7185;">${escapeHtml(copy.subject)}</h2>
      <p>${escapeHtml(copy.message)}</p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0;"><strong>Business:</strong> ${escapeHtml(input.businessName)}</p>
        <p style="margin: 0 0 8px 0;"><strong>Request Reference:</strong> ${escapeHtml(requestReference)}</p>
        <p style="margin: 0 0 8px 0;"><strong>Date:</strong> ${escapeHtml(formatArubaDateTime(input.eventDate))}</p>
        <p style="margin: 0;"><strong>Status:</strong> ${escapeHtml(copy.label)}</p>
      </div>
      ${feedbackBlock}
      <div style="margin: 30px 0;">
        <a href="${requestUrl}" style="background-color: #fb7185; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Setup Request</a>
      </div>
      <p style="margin-bottom: 24px;">Open your Business Dashboard to review the latest setup assistance update.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 16px 0;" />
      <p style="font-weight: bold; margin: 0; color: #1e293b;">Royalty Stamp</p>
      <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Digital Loyalty for Your Business</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: input.recipientEmail,
      subject: copy.subject,
      html,
    });

    await finalizeEmailLog(admin, emailLogId, "sent");
    return { emailSent: true, duplicateSuppressed: false };
  } catch (error) {
    const sanitized = sanitizeMailError(error);
    await finalizeEmailLog(admin, emailLogId, "failed", sanitized);
    return { emailSent: false, duplicateSuppressed: false, error: sanitized };
  }
}