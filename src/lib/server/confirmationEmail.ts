import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";

export type ConfirmationEmailAudience = "business" | "customer" | "general";

type SendConfirmationEmailInput = {
  email: string;
  actionLink: string;
  audience?: ConfirmationEmailAudience;
  displayName?: string;
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

export function getConfirmationEmailOrigin(origin?: string) {
  let finalOrigin = origin || "https://royaltystamp.com";

  if (finalOrigin.includes("softgen.dev") || finalOrigin.includes("localhost")) {
    finalOrigin = "https://royaltystamp.com";
  }

  if (finalOrigin.includes("arubaroyaltystamp.com")) {
    return "https://royaltystamp.com";
  }

  return finalOrigin;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

export function getRecipientDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() || "unknown";
}

export function sanitizeMailError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown email provider error";
  const responseCode = typeof error === "object" && error && "responseCode" in error ? String((error as { responseCode?: unknown }).responseCode || "") : "";
  const command = typeof error === "object" && error && "command" in error ? String((error as { command?: unknown }).command || "") : "";

  if (responseCode) {
    return `Email provider returned ${responseCode}${command ? ` during ${command}` : ""}.`;
  }

  if (message.toLowerCase().includes("auth")) {
    return "Email provider authentication failed.";
  }

  if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("timed out")) {
    return "Email provider timed out.";
  }

  return "Email provider could not send the message.";
}

export async function sendConfirmationEmail({ email, actionLink, audience = "general", displayName }: SendConfirmationEmailInput) {
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
  const greeting = displayName?.trim() ? `Hi ${escapeHtml(displayName.trim())},` : "Hello,";
  const heading = audience === "customer" ? "Verify Your Account" : "Confirm Your Account";
  const intro = audience === "customer"
    ? "Thank you for joining Royalty Stamp. Please confirm your email address to start collecting rewards."
    : "Please confirm your email address to activate your Royalty Stamp account.";

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #1e293b;">
      <h2 style="color: #fb7185;">${heading}</h2>
      <p>${greeting}</p>
      <p>${intro}</p>

      <div style="margin: 30px 0;">
        <a href="${actionLink}" style="background-color: #fb7185; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Confirm Email</a>
      </div>

      <p style="margin-bottom: 24px; font-size: 14px; color: #64748b;">If you did not request this account, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 16px 0;" />
      <p style="font-weight: bold; margin: 0; color: #1e293b;">Royalty Stamp</p>
      <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Digital Loyalty for Your Business</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: "Confirm your Royalty Stamp account",
    html: htmlBody,
  });
}