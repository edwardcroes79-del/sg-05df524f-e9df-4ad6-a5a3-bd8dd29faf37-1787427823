import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

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

    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: "Business ID is required" });
    }

    // 1. Update business status to active
    const { data: business, error: updateError } = await supabase
      .from("businesses")
      .update({ status: "active" })
      .eq("id", businessId)
      .select("business_name, owner_id")
      .single();

    if (updateError) throw updateError;

    // 2. Fetch owner's email address
    const { data: ownerAuth, error: ownerError } = await supabase.auth.admin.getUserById(business.owner_id);
    const ownerEmail = ownerAuth?.user?.email;

    if (!ownerEmail) {
      return res.status(400).json({ error: "Could not find business owner email" });
    }

    // 3. Send approval email via Nodemailer and Titan SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 465,
      secure: process.env.MAIL_ENCRYPTION === 'ssl' || Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    let dashboardUrl = "https://royaltystamp.com/dashboard";
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`;
    } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      dashboardUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/dashboard`;
    }

    const senderName = process.env.MAIL_FROM_NAME?.replace(/['"]/g, '') || "Royalty Stamp";
    const senderEmail = process.env.MAIL_FROM_ADDRESS || "mail@royaltystamp.com";

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

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Business approval error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}