import { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    let businessName = req.body.businessName;
    let businessEmail = req.body.businessEmail;
    let businessPhone = req.body.businessPhone;
    const { origin, businessId, retryEmail } = req.body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // If this is a retry from the admin dashboard, fetch the missing details from the database
    if (retryEmail && businessId && (!businessName || !businessEmail)) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("business_name, email, phone")
        .eq("id", businessId)
        .single();
        
      if (biz) {
        businessName = biz.business_name;
        businessEmail = biz.email;
        businessPhone = biz.phone;
      }
    }

    if (!businessName || !businessEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Safely extract the raw password to prevent Next.js from corrupting the $ symbols via variable expansion
    let mailPassword = process.env.MAIL_PASSWORD;
    try {
      const fs = require('fs');
      const path = require('path');
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

    const adminEmail = "297plugins@gmail.com";
    const fromName = process.env.MAIL_FROM_NAME || "Royalty Stamp";
    const fromEmail = process.env.MAIL_FROM_ADDRESS || "mail@royaltystamp.com";
    
    // Strictly enforce production URL to prevent softgen.dev sandbox links in emails
    let finalOrigin = origin || "https://arubaroyaltystamp.com";
    if (finalOrigin.includes("softgen.dev") || finalOrigin.includes("localhost")) {
      finalOrigin = "https://arubaroyaltystamp.com";
    }
    const adminUrl = `${finalOrigin}/admin`;
    const date = new Date().toLocaleString('en-US', { 
      timeZone: 'America/Aruba',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #fb7185;">New Business Registration</h2>
        <p>A new business has registered for Royalty Stamp and is waiting for approval.</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px 0;"><strong>Business Name:</strong> ${businessName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Business Email:</strong> ${businessEmail}</p>
          <p style="margin: 0 0 8px 0;"><strong>Business Phone:</strong> ${businessPhone || 'N/A'}</p>
          <p style="margin: 0 0 8px 0;"><strong>Registration Date:</strong> ${date}</p>
          <p style="margin: 0;"><strong>Current Status:</strong> <span style="color: #d97706; font-weight: bold;">Pending Approval</span></p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${adminUrl}" style="background-color: #fb7185; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review Business</a>
        </div>

        <p style="margin-bottom: 24px;">Please review the business from your Super Admin Dashboard.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 16px 0;" />
        <p style="font-weight: bold; margin: 0; color: #1e293b;">Royalty Stamp</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Digital Loyalty for Your Business</p>
      </div>
    `;

    // Prepare Email Tracking Log
    let emailLogId: string | null = null;
    if (businessId) {
      try {
        const { data: existingLog } = await supabase
          .from("email_logs")
          .select("*")
          .eq("business_id", businessId)
          .eq("email_type", "admin_notification")
          .maybeSingle();

        if (existingLog) {
          if (existingLog.status === "sent" && !retryEmail) {
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
            email_type: "admin_notification",
            recipient: adminEmail,
            status: "pending"
          }).select().single();
          if (newLog) emailLogId = newLog.id;
        }
      } catch (logErr) {
        console.error("Failed to setup email log", logErr);
      }
    }

    // Attempt to send email
    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: adminEmail,
        subject: "New Business Registration — Approval Required",
        html: htmlBody,
      });

      if (emailLogId) {
        try {
          await supabase.from("email_logs").update({ 
            status: "sent", 
            sent_at: new Date().toISOString() 
          }).eq("id", emailLogId);
        } catch (e) {
          console.error("Failed to update admin email log to sent", e);
        }
      }

      // If successful, record the success in the database (legacy fallback)
      if (businessId) {
        try {
          await supabase
            .from("businesses")
            .update({ admin_notify_status: "sent", admin_notify_error: null })
            .eq("id", businessId);
        } catch (dbError) {
          console.error("Failed to record admin email success:", dbError);
        }
      }
    } catch (emailError: any) {
      console.error("Super Admin Notification Error:", emailError);
      
      if (emailLogId) {
        try {
          await supabase.from("email_logs").update({ 
            status: "failed", 
            error_message: emailError.message || "Unknown SMTP error" 
          }).eq("id", emailLogId);
        } catch (e) {
          console.error("Failed to update admin email log to failed", e);
        }
      }

      // If it fails, record the failure in the database (legacy fallback)
      if (businessId) {
        try {
          await supabase
            .from("businesses")
            .update({ 
              admin_notify_status: "failed", 
              admin_notify_error: emailError.message || "Unknown SMTP error" 
            })
            .eq("id", businessId);
        } catch (dbError) {
          console.error("Failed to record admin email failure:", dbError);
        }
      }
      
      // Always return 200 so onboarding doesn't crash, but pass the error flag
      return res.status(200).json({ success: true, emailSent: false, error: emailError.message });
    }

    return res.status(200).json({ success: true, emailSent: true });
  } catch (error: any) {
    console.error("Critical Notification Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process request" });
  }
}