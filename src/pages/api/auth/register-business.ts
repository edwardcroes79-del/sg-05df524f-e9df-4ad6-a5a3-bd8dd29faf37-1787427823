import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { email, password, returnUrl, origin } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Strictly enforce production URL to prevent softgen.dev sandbox links in emails
    let finalOrigin = origin || "https://arubaroyaltystamp.com";
    if (finalOrigin.includes("softgen.dev") || finalOrigin.includes("localhost")) {
      finalOrigin = "https://arubaroyaltystamp.com";
    }

    const safeReturnUrl = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : "";
    const redirectUrl = `${finalOrigin}/auth/login?confirmed=true${safeReturnUrl}`;

    // Generate secure signup link using Admin API (Bypasses Supabase Email Sender & Rate Limits)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      password: password,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (linkError) {
      // If user already exists and is confirmed, this might throw.
      return res.status(400).json({ error: linkError.message });
    }

    const actionLink = linkData?.properties?.action_link;
    
    if (!actionLink) {
      return res.status(500).json({ error: "Failed to generate confirmation link. Please try again." });
    }

    // Safely extract the raw password to prevent Next.js from corrupting the $ symbols via variable expansion
    let mailPassword = process.env.MAIL_PASSWORD;
    try {
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const match = envContent.match(/^MAIL_PASSWORD=(.*)$/m);
        if (match) {
          let rawPass = match[1].trim();
          if ((rawPass.startsWith('"') && rawPass.endsWith('"')) || (rawPass.startsWith("'") && rawPass.endsWith("'"))) {
            rawPass = rawPass.slice(1, -1);
          }
          mailPassword = rawPass;
        }
      }
    } catch(e) {
      // Fallback to process.env in Vercel production
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
        <h2 style="color: #fb7185;">Confirm Your Account</h2>
        <p>Thank you for registering with Royalty Stamp! Please confirm your email address to activate your account.</p>
        
        <div style="margin: 30px 0;">
          <a href="${actionLink}" style="background-color: #fb7185; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Confirm Email</a>
        </div>

        <p style="margin-bottom: 24px; font-size: 14px; color: #64748b;">If you did not request this account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 16px 0;" />
        <p style="font-weight: bold; margin: 0; color: #1e293b;">Royalty Stamp</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Digital Loyalty for Your Business</p>
      </div>
    `;

    // Attempt to send email via our own SMTP
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: "Confirm your Royalty Stamp account",
      html: htmlBody,
    });

    return res.status(200).json({ success: true, message: "Confirmation email sent successfully via SMTP." });

  } catch (error: any) {
    console.error("Server-Side Registration Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process request" });
  }
}