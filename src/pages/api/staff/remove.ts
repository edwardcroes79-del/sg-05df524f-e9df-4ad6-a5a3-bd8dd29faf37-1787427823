import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { staffId } = req.body;
    const authHeader = req.headers.authorization;

    if (!staffId || typeof staffId !== "string") {
      return res.status(400).json({ error: "Missing or invalid staff ID" });
    }

    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the requesting user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get the business_user record
    const { data: staffRecord, error: staffError } = await supabaseAdmin
      .from("business_users")
      .select("business_id, user_id, role")
      .eq("id", staffId)
      .single();

    if (staffError || !staffRecord) {
      return res.status(404).json({ error: "Staff record not found" });
    }

    // Check if the requesting user is the owner of the business
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id")
      .eq("id", staffRecord.business_id)
      .single();

    if (businessError || !business || business.owner_id !== user.id) {
      return res.status(403).json({ error: "Forbidden: You are not the owner of this business" });
    }

    // Cannot remove the owner through this endpoint
    if (staffRecord.role === "owner" || staffRecord.user_id === user.id) {
      return res.status(400).json({ error: "Cannot remove the business owner" });
    }

    const targetUserId = staffRecord.user_id;

    // 1. Remove the business_users relationship first
    const { error: removeRelError } = await supabaseAdmin
      .from("business_users")
      .delete()
      .eq("id", staffId);

    if (removeRelError) {
      return res.status(500).json({ error: "Failed to remove staff access" });
    }

    // 2. Safely remove the Auth user.
    // We confirmed foreign keys for stamp_transactions, customer_loyalty_cards, rewards, payment_transactions 
    // are tied to `customers.id`, NOT directly to `auth.users.id` with CASCADE that would destroy history.
    // The staff user ID in stamp_transactions (staff_user_id) is nullable or SET NULL/NO ACTION.
    
    if (targetUserId) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (deleteAuthError) {
        console.error("Failed to delete auth user:", deleteAuthError);
        // We don't fail the request here, as the business access is already revoked,
        // but we log it. In a production scenario, we might want a background cleanup job.
      }
    }

    return res.status(200).json({ success: true, message: "Staff member completely removed" });

  } catch (error: any) {
    console.error("Staff removal error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}