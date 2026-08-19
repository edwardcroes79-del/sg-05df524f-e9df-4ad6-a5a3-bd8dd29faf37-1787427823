import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { businessId } = req.body;
  if (!businessId) {
    return res.status(400).json({ error: "Missing businessId" });
  }

  // Retrieve JWT authorization token
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: "Supabase service role key not configured on server" });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized token" });
    }

    // Verify requesting profile is indeed super admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_super_admin, role")
      .eq("id", user.id)
      .single();

    if (profileError || (!profile?.is_super_admin && profile?.role !== 'super_admin')) {
      return res.status(403).json({ error: "Permission denied. Super Admin role required." });
    }

    // Fetch the business details first to get the owner id
    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .select("owner_id, business_name")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Fetch associated staff IDs to clean up their auth accounts as well
    const { data: staffMembers } = await supabaseAdmin
      .from("business_users")
      .select("user_id")
      .eq("business_id", businessId);

    const staffUserIds = staffMembers?.map(m => m.user_id).filter(Boolean) || [];

    // Cascade delete database configurations to prevent breaking key constraints
    await supabaseAdmin.from("stamp_transactions").delete().eq("business_id", businessId);
    await supabaseAdmin.from("rewards").delete().eq("business_id", businessId);
    await supabaseAdmin.from("customer_loyalty_cards").delete().eq("business_id", businessId);
    await supabaseAdmin.from("qr_codes").delete().eq("business_id", businessId);
    await supabaseAdmin.from("loyalty_programs").delete().eq("business_id", businessId);
    await supabaseAdmin.from("subscription_payments").delete().eq("business_id", businessId);
    await supabaseAdmin.from("business_users").delete().eq("business_id", businessId);
    
    // Delete main business row
    const { error: deleteBizError } = await supabaseAdmin
      .from("businesses")
      .delete()
      .eq("id", businessId);

    if (deleteBizError) throw deleteBizError;

    // Safely and permanently delete Auth Accounts (Owner + Staff)
    const usersToDelete = Array.from(new Set([business.owner_id, ...staffUserIds])).filter(Boolean);
    for (const uid of usersToDelete) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid);
      } catch (err) {
        console.error(`Failed to delete auth user ${uid}:`, err);
      }
    }

    return res.status(200).json({ success: true, message: `Successfully deleted business ${business.business_name} and all related data.` });
  } catch (err: any) {
    console.error("Secure business deletion error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete business" });
  }
}