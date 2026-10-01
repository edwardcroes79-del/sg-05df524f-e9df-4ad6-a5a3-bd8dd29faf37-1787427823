import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

type ReceiptResponse = {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

function getBearerToken(req: NextApiRequest) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function isUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ReceiptResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ sent: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ sent: false, error: "Authentication required" });

    const { transactionId } = req.body as { transactionId?: unknown };
    if (!isUuid(transactionId)) {
      return res.status(400).json({ sent: false, error: "A valid transaction ID is required" });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return res.status(401).json({ sent: false, error: userError?.message || "Invalid session" });
    }

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("stamp_transactions")
      .select("id, customer_id, business_id, loyalty_program_id, stamp_number, stamp_type, verification_method, created_at")
      .eq("id", transactionId)
      .maybeSingle();

    if (transactionError) throw transactionError;
    if (!transaction) return res.status(404).json({ sent: false, error: "Stamp transaction was not found" });

    const [{ data: customer, error: customerError }, { data: business, error: businessError }, { data: program, error: programError }] = await Promise.all([
      supabaseAdmin
        .from("customers")
        .select("id, user_id, name, email, email_receipts_enabled")
        .eq("id", transaction.customer_id)
        .maybeSingle(),
      supabaseAdmin
        .from("businesses")
        .select("id, owner_id, business_name")
        .eq("id", transaction.business_id)
        .maybeSingle(),
      supabaseAdmin
        .from("loyalty_programs")
        .select("id, name, reward_title, stamp_target")
        .eq("id", transaction.loyalty_program_id)
        .maybeSingle(),
    ]);

    if (customerError) throw customerError;
    if (businessError) throw businessError;
    if (programError) throw programError;
    if (!customer || !business || !program) {
      return res.status(404).json({ sent: false, error: "Receipt context was not found" });
    }

    const isCustomerOwner = customer.user_id === userData.user.id;
    let isBusinessAuthorized = business.owner_id === userData.user.id;

    if (!isBusinessAuthorized) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("business_users")
        .select("id")
        .eq("business_id", business.id)
        .eq("user_id", userData.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membershipError) throw membershipError;
      isBusinessAuthorized = Boolean(membership);
    }

    if (!isCustomerOwner && !isBusinessAuthorized) {
      return res.status(403).json({ sent: false, error: "Not authorized to send this receipt" });
    }

    if (!customer.email_receipts_enabled) {
      return res.status(200).json({ sent: false, skipped: true, reason: "Customer disabled email receipts" });
    }

    if (!customer.email) {
      return res.status(200).json({ sent: false, skipped: true, reason: "Customer email is missing" });
    }

    if (!process.env.MAIL_USERNAME || !getMailPassword()) {
      console.warn("Stamp receipt email skipped: SMTP credentials are not configured.");
      return res.status(200).json({ sent: false, skipped: true, reason: "Email provider is not configured" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtp.titan.email",
      port: parseInt(process.env.MAIL_PORT || "465", 10),
      secure: process.env.MAIL_ENCRYPTION === "ssl" || parseInt(process.env.MAIL_PORT || "465", 10) === 465,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: getMailPassword(),
      },
    });

    const fromName = process.env.MAIL_FROM_NAME || "Royalty Stamp";
    const fromEmail = process.env.MAIL_FROM_ADDRESS || "mail@royaltystamp.com";
    const createdAt = transaction.created_at ? new Date(transaction.created_at).toLocaleString("en-AW", { timeZone: "America/Aruba" }) : "just now";
    const stampTarget = Number(program.stamp_target || 0);

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #fb7185; margin-bottom: 8px;">Your stamp was added</h2>
        <p>Hi ${escapeHtml(customer.name)},</p>
        <p>You received a stamp from <strong>${escapeHtml(business.business_name)}</strong>.</p>
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Program:</strong> ${escapeHtml(program.name)}</p>
          <p style="margin: 0 0 8px 0;"><strong>Stamp:</strong> #${escapeHtml(String(transaction.stamp_number || ""))}${stampTarget > 0 ? ` of ${stampTarget}` : ""}</p>
          <p style="margin: 0;"><strong>Issued:</strong> ${escapeHtml(createdAt)}</p>
        </div>
        <p style="font-size: 14px; color: #64748b;">If this does not look right, contact the business directly so they can review your loyalty card.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-weight: bold; margin: 0;">Royalty Stamp</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Digital Loyalty for Aruba Businesses</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: customer.email,
      subject: `Stamp receipt from ${business.business_name}`,
      html: htmlBody,
    });

    return res.status(200).json({ sent: true });
  } catch (error: any) {
    console.error("Stamp receipt email failed:", error);
    return res.status(200).json({ sent: false, error: error.message || "Receipt email failed" });
  }
}