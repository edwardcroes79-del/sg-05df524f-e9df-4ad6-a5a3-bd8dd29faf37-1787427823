import { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { businessName, businessEmail, businessPhone, origin } = req.body;

    if (!businessName || !businessEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtp.titan.email",
      port: parseInt(process.env.MAIL_PORT || "465", 10),
      secure: process.env.MAIL_PORT === "465", 
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const adminEmail = "297plugins@gmail.com";
    const fromName = process.env.MAIL_FROM_NAME || "Royalty Stamp";
    const fromEmail = process.env.MAIL_FROM_ADDRESS || "mail@royaltystamp.com";
    
    // Use the dynamic origin passed from the frontend for the dashboard link
    const adminUrl = origin ? `${origin}/admin` : "https://arubaroyaltystamp.com/admin";
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

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: adminEmail,
      subject: "New Business Registration — Approval Required",
      html: htmlBody,
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Super Admin Notification Error:", error);
    return res.status(500).json({ error: error.message || "Failed to send email" });
  }
}