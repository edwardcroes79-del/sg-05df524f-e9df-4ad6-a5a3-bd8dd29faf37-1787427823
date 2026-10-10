import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

interface TurnstileVerifyResult {
  ok: boolean;
  status: number;
  error: string;
}

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TIMEOUT_MS = 5000;

async function verifyTurnstileToken(token: unknown, remoteIp?: string): Promise<TurnstileVerifyResult> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secret || !secret.trim()) {
    return {
      ok: false,
      status: 503,
      error: "Security verification is temporarily unavailable. Please try again later.",
    };
  }

  if (typeof token !== "string" || !token.trim() || token.length > 4096) {
    return {
      ok: false,
      status: 400,
      error: "Security verification is required. Please refresh and try again.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS);

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });

    if (remoteIp) {
      body.set("remoteip", remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: 503,
        error: "Security verification could not be completed. Please try again.",
      };
    }

    const result = (await response.json()) as TurnstileVerifyResponse;

    if (!result.success) {
      return {
        ok: false,
        status: 400,
        error: "Security verification failed. Please refresh and try again.",
      };
    }

    return {
      ok: true,
      status: 200,
      error: "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Turnstile verification failed:", message);

    return {
      ok: false,
      status: 503,
      error: "Security verification could not be completed. Please try again.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getRequestIp(req: NextApiRequest): string | undefined {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0].split(",")[0]?.trim();
  }

  return req.socket.remoteAddress;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email, password, name, returnUrl, origin, turnstileToken } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    const turnstileResult = await verifyTurnstileToken(turnstileToken, getRequestIp(req));

    if (!turnstileResult.ok) {
      return res.status(turnstileResult.status).json({ error: turnstileResult.error });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let finalOrigin = origin || "https://royaltystamp.com";
    
    if (finalOrigin.includes("arubaroyaltystamp.com")) {
      finalOrigin = "https://royaltystamp.com";
    }

    const safeReturnUrl = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : "";
    const redirectUrl = `${finalOrigin}/auth/customer?confirmed=true${safeReturnUrl}`;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
        },
        redirectTo: redirectUrl
      }
    });

    if (linkError) {
      return res.status(400).json({ error: linkError.message });
    }

    const actionLink = linkData?.properties?.action_link;
    
    if (!actionLink) {
      return res.status(500).json({ error: "Failed to generate confirmation link. Please try again." });
    }

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
    } catch (e) {
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtp.titan.email",
      port: parseInt(process.env.MAIL_PORT || "465", 10),
      secure: process.env.MAIL_ENCRYPTION === "ssl" || parseInt(process.env.MAIL_PORT || "465", 10) === 465, 
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: mailPassword,
      },
    });

    const fromName = process.env.MAIL_FROM_NAME || "Royalty Stamp";
    const fromEmail = process.env.MAIL_FROM_ADDRESS || "mail@royaltystamp.com";
    
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #fb7185;">Verify Your Account</h2>
        <p>Hi ${name},</p>
        <p>Thank you for joining Royalty Stamp! Please confirm your email address to start collecting rewards.</p>
        
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
      subject: "Verify your Royalty Stamp account",
      html: htmlBody,
    });

    return res.status(200).json({ success: true, message: "Confirmation email sent successfully via SMTP." });

  } catch (error: any) {
    console.error("Server-Side Customer Registration Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process request" });
  }
}