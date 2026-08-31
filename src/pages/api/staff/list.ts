import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client to bypass RLS securely for this specific read
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { businessId, userIds } = req.body;
    const authHeader = req.headers.authorization;

    if (!businessId || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the requesting user using the admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // STRICT SECURITY: Verify the requester is the owner or active staff of THIS business
    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select("owner_id")
      .eq("id", businessId)
      .single();

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    let isAuthorized = false;
    
    if (business.owner_id === user.id) {
      isAuthorized = true;
    } else {
      const { data: membership } = await supabaseAdmin
        .from("business_users")
        .select("id")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (membership) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this business" });
    }

    // STRICT SECURITY: Ensure requested userIds actually belong to this business
    // This prevents an authorized admin from passing random user IDs to retrieve emails from other businesses
    const { data: businessStaff } = await supabaseAdmin
      .from("business_users")
      .select("user_id")
      .eq("business_id", businessId);
      
    const validStaffIds = businessStaff?.map(s => s.user_id) || [];
    const allowedUserIds = userIds.filter(id => validStaffIds.includes(id));

    if (allowedUserIds.length === 0) {
      return res.status(200).json({ profiles: [] });
    }

    // Now securely fetch the profiles for the authorized users
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, avatar_url, role, status")
      .in("id", allowedUserIds);

    // Enrich with actual auth emails to guarantee accuracy from the secure auth.users system,
    // iterating over allowedUserIds so we don't miss users who lack a 'profiles' row (e.g. newly invited staff)
    const enrichedProfiles = await Promise.all(
      allowedUserIds.map(async (uid: string) => {
        let authEmail = null;
        let authName = null;
        
        try {
          const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(uid);
          authEmail = authUser?.email;
          authName = authUser?.user_metadata?.full_name;
        } catch (e) {
          // Ignore if auth user lookup fails
        }

        const existingProfile = profiles?.find((p) => p.id === uid) || {};

        return {
          id: uid,
          ...existingProfile,
          email: authEmail || existingProfile.email || null,
          full_name: existingProfile.full_name || authName || null
        };
      })
    );

    return res.status(200).json({ profiles: enrichedProfiles });

  } catch (error: any) {
    console.error("Staff list error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}