import type { NextApiRequest, NextApiResponse } from "next";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { getRequestIp, verifyTurnstileToken } from "@/lib/server/turnstile";

const CANONICAL_RECOVERY_REDIRECT = "https://royaltystamp.com/auth/update-password";
const ALLOWED_RECOVERY_REDIRECTS = new Set([
  "https://royaltystamp.com/auth/update-password",
  "https://www.royaltystamp.com/auth/update-password",
]);
const GENERIC_SUCCESS_MESSAGE = "If an account exists for this email, password reset instructions will be sent shortly.";
const RATE_LIMIT_ACTION = "password_recovery_request";
const RATE_LIMIT_WINDOW_SECONDS = 3600;
const RATE_LIMIT_MAX_BY_EMAIL = 3;
const RATE_LIMIT_MAX_BY_IP = 10;

interface RecoveryRequestBody {
  email?: unknown;
  redirectTo?: unknown;
  turnstileToken?: unknown;
}

interface RecoveryResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

interface ApiRateLimitRow {
  id: string;
  attempts: number | null;
  window_start: string;
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function resolveRedirect(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return CANONICAL_RECOVERY_REDIRECT;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!ALLOWED_RECOVERY_REDIRECTS.has(trimmed)) {
    return null;
  }

  return trimmed;
}

function hashRateLimitPart(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildRateKey(kind: "ip" | "email", value: string): string {
  return `auth:${RATE_LIMIT_ACTION}:${kind}:${hashRateLimitPart(value)}`;
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function enforceApiRateLimit(
  supabaseAdmin: any,
  rateKey: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { data, error: readError } = await supabaseAdmin
    .from("api_rate_limits")
    .select("id, attempts, window_start")
    .eq("rate_key", rateKey)
    .eq("action", RATE_LIMIT_ACTION)
    .maybeSingle();

  if (readError) {
    console.error("Password recovery rate-limit read failed");
    return false;
  }

  const existingLimit = data as ApiRateLimitRow | null;

  if (!existingLimit || new Date(existingLimit.window_start).toISOString() < windowStart) {
    const { error } = await supabaseAdmin
      .from("api_rate_limits")
      .upsert({
        rate_key: rateKey,
        action: RATE_LIMIT_ACTION,
        attempts: 1,
        window_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "rate_key,action" });

    if (error) {
      console.error("Password recovery rate-limit reset failed");
    }

    return !error;
  }

  if ((existingLimit.attempts || 0) >= maxAttempts) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from("api_rate_limits")
    .update({
      attempts: (existingLimit.attempts || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingLimit.id);

  if (error) {
    console.error("Password recovery rate-limit update failed");
  }

  return !error;
}

function getMailPassword(): string | undefined {
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

function createRecoveryEmailHtml(actionLink: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #1e293b;">
      <h2 style="color: #fb7185;">Reset Your Royalty Stamp Password</h2>
      <p>We received a request to reset the password for your Royalty Stamp account.</p>
      <p>Use the secure link below to choose a new password. This link is generated and verified by Supabase Auth.</p>

      <div style="margin: 30px 0;">
        <a href="${actionLink}" style="background-color: #fb7185; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>

      <p style="margin-bottom: 24px; font-size: 14px; color: #64748b;">If you did not request this password reset, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 16px 0;" />
      <p style="font-weight: bold; margin: 0; color: #1e293b;">Royalty Stamp</p>
      <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Digital Loyalty for Your Business</p>
    </div>
  `;
}

async function sendRecoveryEmail(email: string, actionLink: string): Promise<void> {
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

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: "Reset your Royalty Stamp password",
    html: createRecoveryEmailHtml(actionLink),
  });
}

function genericSuccess(res: NextApiResponse<RecoveryResponse>) {
  return res.status(200).json({
    success: true,
    message: GENERIC_SUCCESS_MESSAGE,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<RecoveryResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as RecoveryRequestBody;
  const email = normalizeEmail(body.email);
  const redirectTo = resolveRedirect(body.redirectTo);

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  if (!redirectTo) {
    return res.status(400).json({ error: "Password recovery redirect is not allowed." });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    return res.status(503).json({ error: "Password recovery is temporarily unavailable." });
  }

  const requestIp = getRequestIp(req) || "unknown";
  const ipWithinLimit = await enforceApiRateLimit(
    supabaseAdmin,
    buildRateKey("ip", requestIp),
    RATE_LIMIT_MAX_BY_IP,
    RATE_LIMIT_WINDOW_SECONDS
  );
  const emailWithinLimit = await enforceApiRateLimit(
    supabaseAdmin,
    buildRateKey("email", email),
    RATE_LIMIT_MAX_BY_EMAIL,
    RATE_LIMIT_WINDOW_SECONDS
  );

  if (!ipWithinLimit || !emailWithinLimit) {
    return res.status(429).json({ error: "Too many password recovery requests. Please try again later." });
  }

  const turnstileResult = await verifyTurnstileToken(body.turnstileToken, requestIp);

  if (!turnstileResult.ok) {
    return res.status(turnstileResult.status).json({ error: turnstileResult.error });
  }

  try {
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo,
      },
    });

    if (linkError) {
      console.error("Password recovery link generation failed");
      return genericSuccess(res);
    }

    const actionLink = linkData?.properties?.action_link;

    if (!actionLink) {
      console.error("Password recovery link generation returned no action link");
      return genericSuccess(res);
    }

    try {
      await sendRecoveryEmail(email, actionLink);
    } catch {
      console.error("Password recovery SMTP delivery failed");
      return genericSuccess(res);
    }

    return genericSuccess(res);
  } catch {
    console.error("Password recovery request failed");
    return genericSuccess(res);
  }
}