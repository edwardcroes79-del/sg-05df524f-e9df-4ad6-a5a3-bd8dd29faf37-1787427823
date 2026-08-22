import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const getEnv = (key: string) => {
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
    const line = envContent.split("\n").find((l) => l.startsWith(`${key}=`));
    if (line) {
      let val = line.substring(key.length + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      return val;
    }
  } catch (e) {}
  return process.env[key] || "";
};

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL")!;
const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const { businessId, retryEmail } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: "Business ID is required" });
    }

    // 1. Fetch current business data
    const { data: business, error: fetchError } = await supabase
      .from("businesses")
      .select("id, business_name, owner_id, status, approval_email_status")
      .eq("id", businessId)
      .single();

    if (fetchError || !business) {
      return res.status(404).json({ error: "Business not found" });
    }

    if (business.status === "active" && !retryEmail) {
      return res.status(200).json({ success: true, message: "Business is already active" });
    }

    // 2. Fetch owner's email address upfront
    const { data: ownerAuth, error: ownerError } = await supabase.auth.admin.getUserById(business.owner_id);
    const ownerEmail = ownerAuth?.user?.email;

    if (!ownerEmail) {
      return res.status(400).json({ error: "Could not find business owner email" });
    }

    // 3. Perform database update securely
    if (business.status !== "active") {
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ status: "active" })
        .eq("id", businessId);

      if (updateError) throw updateError;
    }

    // Prepare Email Tracking Log
    let emailLogId: string | null = null;
    try {
      const { data: existingLog } = await supabase
        .from("email_logs")
        .select("*")
        .eq("business_id", businessId)
        .eq("email_type", "client_approval")
        .maybeSingle();

      if (existingLog) {
        if (existingLog.status === "sent" && !retryEmail) {
          // Already sent and not a retry request
          return res.status(200).json({ success: true, emailSent: true, message: "Email already sent" });
        }
        emailLogId = existingLog.id;
        await supabase.from("email_logs").update({ 
          attempt_count: (existingLog.attempt_count || 1) + 1, 
          status: "pending", 
          error_message: null 
        }).eq("id", emailLogId);
      } else {
        const { data: newLog } = await supabase.from("email_logs").insert({
          business_id: businessId,
          email_type: "client_approval",
          recipient: ownerEmail,
          status: "pending"
        }).select().single();
        if (newLog) emailLogId = newLog.id;
      }
    } catch (logErr) {
      console.error("Failed to setup email log", logErr);
    }

    // 4. Send approval email via Nodemailer (wrapped in try/catch to prevent blocking the UI on failure)
    try {
      const transporter = nodemailer.createTransport({
        host: getEnv("MAIL_HOST") || "smtp.titan.email",
        port: Number(getEnv("MAIL_PORT")) || 465,
        secure: getEnv("MAIL_ENCRYPTION") === "ssl" || Number(getEnv("MAIL_PORT")) === 465,
        auth: {
          user: getEnv("MAIL_USERNAME"),
          pass: getEnv("MAIL_PASSWORD"),
        },
      });

      let dashboardUrl = "https://royaltystamp.com/dashboard";
      if (getEnv("NEXT_PUBLIC_SITE_URL")) {
        dashboardUrl = `${getEnv("NEXT_PUBLIC_SITE_URL")}/dashboard`;
      } else if (getEnv("NEXT_PUBLIC_VERCEL_URL")) {
        dashboardUrl = `https://${getEnv("NEXT_PUBLIC_VERCEL_URL")}/dashboard`;
      }

      const senderName = getEnv("MAIL_FROM_NAME") || "Royalty Stamp";
      const senderEmail = getEnv("MAIL_FROM_ADDRESS") || "mail@royaltystamp.com";

      const mailOptions = {
        from: `"${senderName}" <${senderEmail}>`,
        to: ownerEmail,
        subject: "🎉 Welcome to Royalty Stamp — Your Business Has Been Approved",
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #333333; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #fb7185; margin-top: 0;">Welcome to Royalty Stamp! 🎉</h2>
            <p style="font-size: 16px; line-height: 1.5;">Your business account for <strong>${business.business_name}</strong> has been approved and is now ready to use.</p>
            <p style="font-size: 16px; line-height: 1.5;">You can now log in and start setting up your loyalty program, customize your loyalty card, create your QR code, and start rewarding your customers.</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${dashboardUrl}" style="background-color: #fb7185; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Go to Your Dashboard</a>
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