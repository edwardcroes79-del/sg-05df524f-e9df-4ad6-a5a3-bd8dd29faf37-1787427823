import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isContractExpired(business: any) {
  if (!business?.contract_end_date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const contractEnd = new Date(`${business.contract_end_date}T00:00:00`);
  return business.contract_status === "expired" || contractEnd <= today;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { staffMembershipId, allowSearchSendStamp } = req.body;
    const authHeader = req.headers.authorization;

    if (!staffMembershipId || typeof staffMembershipId !== "string" || typeof allowSearchSendStamp !== "boolean") {
      return res.status(400).json({ error: "Missing or invalid permission fields" });
    }

    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: staffMembership, error: staffError } = await supabaseAdmin
      .from("business_users")
      .select("id, business_id, user_id, role, status")
      .eq("id", staffMembershipId)
      .maybeSingle();

    if (staffError || !staffMembership) {
      return res.status(404).json({ error: "Staff membership not found" });
    }

    if (staffMembership.role !== "staff") {
      return res.status(400).json({ error: "Search & Send Stamp permission applies to staff accounts only. Owner access is not restricted by this setting." });
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id, contract_end_date, contract_status")
      .eq("id", staffMembership.business_id)
      .maybeSingle();

    if (businessError || !business) {
      return res.status(404).json({ error: "Business not found" });
    }

    if (business.owner_id !== user.id) {
      return res.status(403).json({ error: "Forbidden: only the business owner can change staff permissions" });
    }

    if (isContractExpired(business)) {
      return res.status(403).json({ error: "Your Royalty Stamp contract has expired. Please contact Royalty Stamp to renew." });
    }

    const { data: updatedMembership, error: updateError } = await supabaseAdmin
      .from("business_users")
      .update({
        allow_search_send_stamp: allowSearchSendStamp,
      })
      .eq("id", staffMembership.id)
      .eq("business_id", business.id)
      .select("id, allow_search_send_stamp")
      .single();

    if (updateError) {
      return res.status(500).json({ error: "Failed to update Search & Send Stamp permission" });
    }

    return res.status(200).json({
      success: true,
      staff: updatedMembership,
    });
  } catch (error) {
    console.error("Search & Send permission update error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}