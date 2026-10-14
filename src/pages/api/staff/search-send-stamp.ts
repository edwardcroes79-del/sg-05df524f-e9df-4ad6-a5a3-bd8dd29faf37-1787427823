import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isContractExpired(business: any) {
  if (!business?.contract_end_date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const contractEnd = new Date(`${business.contract_end_date}T00:00:00`);
  return business.contract_status === "expired" || contractEnd <= today;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { businessId, customerId, loyaltyProgramId, locationId } = req.body;
    const authHeader = req.headers.authorization;

    if (!businessId || !customerId || !loyaltyProgramId || typeof businessId !== "string" || typeof customerId !== "string" || typeof loyaltyProgramId !== "string") {
      return res.status(400).json({ error: "Missing Search & Send Stamp fields" });
    }

    if (!uuidRegex.test(businessId) || !uuidRegex.test(customerId) || !uuidRegex.test(loyaltyProgramId) || (locationId && (typeof locationId !== "string" || !uuidRegex.test(locationId)))) {
      return res.status(400).json({ error: "Invalid Search & Send Stamp identifiers" });
    }

    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id, contract_end_date, contract_status")
      .eq("id", businessId)
      .maybeSingle();

    if (businessError || !business) {
      return res.status(404).json({ error: "Business not found" });
    }

    if (isContractExpired(business)) {
      return res.status(403).json({ error: "Your Royalty Stamp contract has expired. Please contact Royalty Stamp to renew." });
    }

    const isOwner = business.owner_id === user.id;

    if (!isOwner) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("business_users")
        .select("id, allow_search_send_stamp, status")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError || !membership) {
        return res.status(403).json({ error: "Forbidden: you do not have active staff access to this business" });
      }

      if (membership.allow_search_send_stamp !== true) {
        return res.status(403).json({ error: "Search & Send Stamp is not enabled for this staff account" });
      }
    }

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const params: Record<string, string> = {
      p_customer_id: customerId,
      p_business_id: businessId,
      p_loyalty_program_id: loyaltyProgramId,
    };

    if (locationId) {
      params.p_location_id = locationId;
    }

    const { data, error } = await (supabaseUser.rpc as any)("issue_stamp_tx", params);

    if (error) {
      return res.status(400).json({ error: error.message || "Stamp could not be issued" });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Search & Send Stamp error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}