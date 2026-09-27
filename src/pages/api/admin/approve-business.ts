import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify Super Admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin, role")
      .eq("id", user.id)
      .single();

    if (!profile?.is_super_admin && profile?.role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden: Super Admin access required" });
    }

    const { businessId, retryEmail, origin } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: "Business ID is required" });
    }

    // 1. Fetch current business data
    const { data: business, error: fetchError } = await supabase
      .from("businesses")
      .select("id, business_name, email, owner_id, status, approval_email_status")
      .eq("id", businessId)
      .single();

    if (fetchError || !business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // 2. Fetch email address upfront. Prefer the registered business email, then fall back to the auth owner email.
    const { data: ownerAuth, error: ownerError } = await supabase.auth.admin.getUserById(business.owner_id);
    if (ownerError) {
      console.error("Failed to fetch business owner auth user", ownerError);
    }

    const ownerEmail = ownerAuth?.user?.email;
    const recipientEmail = business.email || ownerEmail;

    if (!recipientEmail) {
      return res.status(400).json({ error: "Could not find business approval email recipient" });
    }

    // 3. Prepare Email Tracking Log before deciding whether to resend.
    let emailLogId: string | null = null;
    let existingEmailAlreadySent = business.approval_email_status === "sent";

    try {
      const { data: existingLog } = await supabase
        .from("email_logs")
        .select("*")
        .eq("business_id", businessId)
        .eq("email_type", "client_approval")
        .maybeSingle();

      if (existingLog) {
        existingEmailAlreadySent = existingEmailAlreadySent || existingLog.status === "sent";

        if (existingLog.status === "sent" && !retryEmail) {
          return res.status(200).json({ success: true, emailSent: true, message: "Email already sent" });
        }

        emailLogId = existingLog.id;
        await supabase.from("email_logs").update({
          attempt_count: (existingLog.attempt_count || 1) + 1,
          recipient: recipientEmail,
          status: "pending",
          error_message: null
        }).eq("id", emailLogId);
      } else {
        const { data: newLog } = await supabase.from("email_logs").insert({
          business_id: businessId,
          email_type: "client_approval",
          recipient: recipientEmail,
          status: "pending"
        }).select().single();

        if (newLog) emailLogId = newLog.id;
      }
    } catch (logErr) {
      console.error("Failed to setup email log", logErr);
    }

    if (business.status === "active" && existingEmailAlreadySent && !retryEmail) {
      return res.status(200).json({ success: true, emailSent: true, message: "Business is already active and approval email was already sent" });
    }

    // 4. Perform database update securely. Do not reset trial, plan, or subscription fields.
    if (business.status !== "active") {
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ status: "active" })
        .eq("id", businessId);

      if (updateError) throw updateError;
    }

    // 5. Send approval email via Nodemailer (wrapped in try/catch to prevent blocking the UI on failure)
    try {
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
        port: Number(process.env.MAIL_PORT) || 465,
        secure: process.env.MAIL_ENCRYPTION === "ssl" || Number(process.env.MAIL_PORT) === 465,
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: mailPassword,
        },
      });

      // Strictly enforce production URL to prevent softgen.dev, localhost, or legacy domains in emails
      const dashboardUrl = "https://royaltystamp.com/dashboard";

      const senderName = process.env.MAIL_FROM_NAME || "Royalty Stamp";
      const senderEmail = process.env.MAIL_FROM_ADDRESS || "mail@royaltystamp.com";

      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: recipientEmail,
        subject: "Your Royalty Stamp Business Account Has Been Approved",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333333; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #fb7185; margin-top: 0;">Your Royalty Stamp Business Account Has Been Approved</h2>
            <p style="font-size: 16px; line-height: 1.5;">Your Royalty Stamp business account for <strong>${business.business_name}</strong> has been approved and is now ready to use.</p>
            <p style="font-size: 16px; line-height: 1.5;">You can now log in and access your Business Dashboard to set up your loyalty program, customize your loyalty card, create your QR code, and start rewarding your customers.</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${dashboardUrl}" style="background-color: #fb7185; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Access Your Business Dashboard</a>
            </div>
            <p style="font-size: 16px; line-height: 1.5;">Thank you for choosing <strong>Royalty Stamp</strong>.</p>
            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #888888; text-align: center;">
              <strong>Royalty Stamp</strong><br/>
              Digital Loyalty for Your Business
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);

      // Update log to success
      if (emailLogId) {
        try {
          await supabase.from("email_logs").update({ 
            status: "sent", 
            sent_at: new Date().toISOString() 
          }).eq("id", emailLogId);
        } catch (e) {
          console.error("Failed to update email log to sent", e);
        }
      }

      // Legacy fallback
      try {
        await supabase
          .from("businesses")
          .update({ approval_email_status: "sent", approval_email_error: null })
          .eq("id", businessId);
      } catch (e) {
        console.error("Failed to update email status", e);
      }
    } catch (emailError: any) {
      console.error("Non-fatal: Failed to send approval email", emailError);
      
      // Update log to failed
      if (emailLogId) {
        try {
          await supabase.from("email_logs").update({ 
            status: "failed", 
            error_message: emailError.message || "Unknown SMTP error" 
          }).eq("id", emailLogId);
        } catch (e) {
          console.error("Failed to update email log to failed", e);
        }
      }

      // Legacy fallback
      try {
        await supabase
          .from("businesses")
          .update({ 
            approval_email_status: "failed", 
            approval_email_error: emailError.message || "Unknown SMTP error" 
          })
          .eq("id", businessId);
      } catch (e) {
        console.error("Failed to update email failure status", e);
      }
      // Return 200 anyway since the database was successfully updated
      return res.status(200).json({ success: true, emailSent: false, error: emailError.message });
    }

    return res.status(200).json({ success: true, emailSent: true });
  } catch (err: any) {
    console.error("Business approval error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}