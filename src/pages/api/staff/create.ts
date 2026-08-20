import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function enforceApiRateLimit(rateKey: string, action: string, maxAttempts: number, windowSeconds: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { data: existingLimit, error: readError } = await supabaseAdmin
    .from("api_rate_limits")
    .select("id, attempts, window_start")
    .eq("rate_key", rateKey)
    .eq("action", action)
    .maybeSingle();

  if (readError) {
    return false;
  }

  if (!existingLimit || new Date(existingLimit.window_start).toISOString() < windowStart) {
    const { error } = await supabaseAdmin
      .from("api_rate_limits")
      .upsert({
        rate_key: rateKey,
        action,
        attempts: 1,
        window_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "rate_key,action" });

    return !error;
  }

  if ((existingLimit.attempts || 0) >= maxAttempts) {
    return false;
  }

  const { error } = await supabaseAdmin
    .from("api_rate_limits")
    .update({
      attempts: (existingLimit.attempts || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingLimit.id);

  return !error;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { businessId, name, email, password } = req.body;
    const authHeader = req.headers.authorization;

    if (!businessId || typeof businessId !== "string" || !name || typeof name !== "string" || !email || typeof email !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({ error: "Missing or invalid staff account fields" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Staff password must be at least 8 characters" });
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

    const rateKey = `${user.id}:${businessId}:staff_create`;
    const withinLimit = await enforceApiRateLimit(rateKey, "staff_create", 5, 3600);

    if (!withinLimit) {
      return res.status(429).json({ error: "Too many staff creation attempts. Please try again later." });
    }

    // Check if the user is the owner of the business
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id, subscription_plan")
      .eq("id", businessId)
      .single();

    if (businessError || !business || business.owner_id !== user.id) {
      return res.status(403).json({ error: "Forbidden: You are not the owner of this business" });
    }

    // Get the plan's staff limit
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("max_staff")
      .eq("id", business.subscription_plan)
      .single();

    const maxStaff = plan?.max_staff || 1;

    // Get current active staff count
    const { count: activeStaffCount, error: countError } = await supabaseAdmin
      .from("business_users")
      .select("id", { count: "exact" })
      .eq("business_id", businessId)
      .eq("status", "active")
      .neq("user_id", user.id); // Exclude the owner if they are in there somehow

    if (countError) {
      return res.status(500).json({ error: "Failed to verify current staff count" });
    }

    // Enforce Plan Limit Server-Side
    if ((activeStaffCount || 0) >= maxStaff) {
      return res.status(403).json({ 
        error: "Staff limit reached. Please upgrade your plan to add more staff.",
        limitReached: true
      });
    }

    // Create the user in Supabase Auth
    const { data: newAuthUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for staff
      user_metadata: {
        full_name: name
      }
    });

    if (createUserError) {
      return res.status(400).json({ error: createUserError.message });
    }

    const newUserId = newAuthUser.user.id;

    // Update the profile to indicate they are business_staff
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: name,
        role: "business_staff"
      })
      .eq("id", newUserId);

    // Insert into business_users
    const { error: linkError } = await supabaseAdmin
      .from("business_users")
      .insert({
        business_id: businessId,
        user_id: newUserId,
        role: "staff",
        status: "active"
      });

    if (linkError) {
      // Rollback auth user creation if linking fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return res.status(500).json({ error: "Failed to link staff account to business" });
    }

    return res.status(200).json({ success: true, message: "Staff account created successfully" });

  } catch (error: any) {
    console.error("Staff creation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}