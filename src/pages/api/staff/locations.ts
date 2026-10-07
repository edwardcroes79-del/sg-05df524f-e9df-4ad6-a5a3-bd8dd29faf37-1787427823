import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type StaffLocationPayload = {
  business_id?: string;
  business_user_id?: string;
  location_id?: string;
  is_default?: boolean;
  status?: "active" | "inactive";
};

function createServiceClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server configuration is incomplete");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function getAuthenticatedUser(req: NextApiRequest) {
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase server configuration is incomplete");
  }

  const authorization = req.headers.authorization;
  if (!authorization) {
    throw new Error("Missing authorization header");
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    throw new Error("Not authenticated");
  }

  return data.user;
}

async function requireCorporateAdmin(admin: any, userId: string, businessId: string) {
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .select("id, owner_id, subscription_plan")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError) throw businessError;
  if (!business) throw new Error("Business not found");
  if (business.owner_id !== userId) {
    throw new Error("Only the Corporate Admin can manage staff location assignments");
  }

  const { data: maxLocations, error: entitlementError } = await admin.rpc("get_business_effective_numeric_limit", {
    p_business_id: business.id,
    p_key: "max_locations",
    p_fallback: 0,
  });

  if (entitlementError) throw entitlementError;
  if (Number(maxLocations || 0) <= 0) {
    throw new Error("Corporate location assignments are not enabled for this business");
  }

  return business;
}

async function audit(admin: any, userId: string, action: string, targetId: string | null, metadata: Record<string, unknown>) {
  await admin.from("audit_logs").insert({
    admin_user_id: userId,
    action,
    target_type: "business_user_location",
    target_id: targetId,
    metadata,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const admin = createServiceClient();
    const user = await getAuthenticatedUser(req);
    const payload = (req.method === "GET" ? req.query : req.body) as StaffLocationPayload;

    if (!payload.business_id || typeof payload.business_id !== "string") {
      return res.status(400).json({ error: "Business ID is required" });
    }

    await requireCorporateAdmin(admin, user.id, payload.business_id);

    if (req.method === "GET") {
      let query = admin
        .from("business_user_locations")
        .select(`
          *,
          business_locations (
            id,
            name,
            address,
            status
          ),
          business_users (
            id,
            user_id,
            role,
            status
          )
        `)
        .eq("business_id", payload.business_id)
        .order("created_at", { ascending: true });

      if (payload.business_user_id && typeof payload.business_user_id === "string") {
        query = query.eq("business_user_id", payload.business_user_id);
      }

      const { data: assignments, error } = await query;
      if (error) throw error;

      return res.status(200).json({ success: true, assignments: assignments || [] });
    }

    if (req.method === "POST") {
      if (!payload.business_user_id || typeof payload.business_user_id !== "string" || !payload.location_id || typeof payload.location_id !== "string") {
        return res.status(400).json({ error: "Staff record and location are required" });
      }

      const [{ data: staffRecord, error: staffError }, { data: location, error: locationError }] = await Promise.all([
        admin
          .from("business_users")
          .select("id, business_id, role, status")
          .eq("id", payload.business_user_id)
          .eq("business_id", payload.business_id)
          .maybeSingle(),
        admin
          .from("business_locations")
          .select("id, business_id, status")
          .eq("id", payload.location_id)
          .eq("business_id", payload.business_id)
          .maybeSingle(),
      ]);

      if (staffError) throw staffError;
      if (locationError) throw locationError;
      if (!staffRecord) return res.status(404).json({ error: "Staff record not found for this business" });
      if (!location) return res.status(404).json({ error: "Location not found for this business" });
      if (location.status === "inactive") return res.status(400).json({ error: "Cannot assign staff to an inactive location" });

      if (payload.is_default) {
        const { error: defaultError } = await admin
          .from("business_user_locations")
          .update({ is_default: false, updated_at: new Date().toISOString(), updated_by: user.id })
          .eq("business_id", payload.business_id)
          .eq("business_user_id", payload.business_user_id);

        if (defaultError) throw defaultError;
      }

      const { data: assignment, error } = await admin
        .from("business_user_locations")
        .upsert({
          business_id: payload.business_id,
          business_user_id: payload.business_user_id,
          location_id: payload.location_id,
          is_default: Boolean(payload.is_default),
          status: payload.status || "active",
          created_by: user.id,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "business_user_id,location_id" })
        .select("*")
        .single();

      if (error) throw error;
      await audit(admin, user.id, "business_user_location_assigned", assignment.id, {
        business_id: payload.business_id,
        business_user_id: payload.business_user_id,
        location_id: payload.location_id,
        is_default: Boolean(payload.is_default),
        status: payload.status || "active",
      });

      return res.status(200).json({ success: true, assignment });
    }

    if (req.method === "PATCH") {
      if (!payload.business_user_id || typeof payload.business_user_id !== "string" || !payload.location_id || typeof payload.location_id !== "string") {
        return res.status(400).json({ error: "Staff record and location are required" });
      }

      const updates: Record<string, unknown> = {
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (typeof payload.is_default === "boolean") {
        updates.is_default = payload.is_default;

        if (payload.is_default) {
          const { error: defaultError } = await admin
            .from("business_user_locations")
            .update({ is_default: false, updated_at: new Date().toISOString(), updated_by: user.id })
            .eq("business_id", payload.business_id)
            .eq("business_user_id", payload.business_user_id);

          if (defaultError) throw defaultError;
        }
      }

      if (payload.status === "active" || payload.status === "inactive") {
        updates.status = payload.status;
      }

      const { data: assignment, error } = await admin
        .from("business_user_locations")
        .update(updates)
        .eq("business_id", payload.business_id)
        .eq("business_user_id", payload.business_user_id)
        .eq("location_id", payload.location_id)
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (!assignment) return res.status(404).json({ error: "Staff location assignment not found" });

      await audit(admin, user.id, "business_user_location_updated", assignment.id, {
        business_id: payload.business_id,
        business_user_id: payload.business_user_id,
        location_id: payload.location_id,
        updates,
      });

      return res.status(200).json({ success: true, assignment });
    }

    if (req.method === "DELETE") {
      if (!payload.business_user_id || typeof payload.business_user_id !== "string" || !payload.location_id || typeof payload.location_id !== "string") {
        return res.status(400).json({ error: "Staff record and location are required" });
      }

      const { data: assignment, error } = await admin
        .from("business_user_locations")
        .update({
          status: "inactive",
          is_default: false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", payload.business_id)
        .eq("business_user_id", payload.business_user_id)
        .eq("location_id", payload.location_id)
        .select("*")
        .maybeSingle();

      if (error) throw error;
      if (!assignment) return res.status(404).json({ error: "Staff location assignment not found" });

      await audit(admin, user.id, "business_user_location_removed", assignment.id, {
        business_id: payload.business_id,
        business_user_id: payload.business_user_id,
        location_id: payload.location_id,
      });

      return res.status(200).json({ success: true, assignment });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    const message = error.message || "Failed to manage staff location assignment";
    const status = message.includes("Not authenticated") || message.includes("authorization") ? 401 : message.includes("Only the Corporate Admin") || message.includes("not enabled") ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}