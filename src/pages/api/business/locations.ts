import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type LocationPayload = {
  id?: string;
  business_id?: string;
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  manager_name?: string | null;
  status?: "active" | "temporarily_closed" | "inactive";
  metadata?: Record<string, unknown>;
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

async function resolveBusinessAccess(admin: any, userId: string, requestedBusinessId?: string) {
  let business: any = null;
  let membership: any = null;

  if (requestedBusinessId) {
    const { data: requestedBusiness, error } = await admin
      .from("businesses")
      .select("id, owner_id, business_name, subscription_plan")
      .eq("id", requestedBusinessId)
      .maybeSingle();

    if (error) throw error;
    business = requestedBusiness;
  } else {
    const { data: ownedBusiness, error: ownedError } = await admin
      .from("businesses")
      .select("id, owner_id, business_name, subscription_plan")
      .eq("owner_id", userId)
      .maybeSingle();

    if (ownedError) throw ownedError;
    business = ownedBusiness;

    if (!business) {
      const { data: activeMembership, error: membershipError } = await admin
        .from("business_users")
        .select("id, business_id, user_id, role, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (membershipError) throw membershipError;
      membership = activeMembership;

      if (membership?.business_id) {
        const { data: memberBusiness, error: memberBusinessError } = await admin
          .from("businesses")
          .select("id, owner_id, business_name, subscription_plan")
          .eq("id", membership.business_id)
          .maybeSingle();

        if (memberBusinessError) throw memberBusinessError;
        business = memberBusiness;
      }
    }
  }

  if (!business) {
    throw new Error("Business access required");
  }

  if (!membership && business.owner_id !== userId) {
    const { data: activeMembership, error: membershipError } = await admin
      .from("business_users")
      .select("id, business_id, user_id, role, status")
      .eq("business_id", business.id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) throw membershipError;
    membership = activeMembership;
  }

  const isOwner = business.owner_id === userId;
  if (!isOwner && !membership) {
    throw new Error("Forbidden: You do not have access to this business");
  }

  const { data: maxLocations, error: entitlementError } = await admin.rpc("get_business_effective_numeric_limit", {
    p_business_id: business.id,
    p_key: "max_locations",
    p_fallback: 0,
  });

  if (entitlementError) throw entitlementError;
  if (Number(maxLocations || 0) <= 0) {
    throw new Error("Corporate location management is not enabled for this business");
  }

  return {
    business,
    membership,
    isOwner,
    maxLocations: Number(maxLocations || 0),
  };
}

async function audit(admin: any, userId: string, action: string, targetId: string | null, metadata: Record<string, unknown>) {
  await admin.from("audit_logs").insert({
    admin_user_id: userId,
    action,
    target_type: "business_location",
    target_id: targetId,
    metadata,
  });
}

function sanitizeStatus(status: unknown) {
  if (status === "active" || status === "temporarily_closed" || status === "inactive") {
    return status;
  }

  return "active";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const admin = createServiceClient();
    const user = await getAuthenticatedUser(req);
    const payload = (req.method === "GET" ? req.query : req.body) as LocationPayload;
    const { business, membership, isOwner, maxLocations } = await resolveBusinessAccess(admin, user.id, typeof payload.business_id === "string" ? payload.business_id : undefined);

    if (req.method === "GET") {
      let query = admin
        .from("business_locations")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true });

      if (!isOwner && membership?.id) {
        const { data: assignments, error: assignmentError } = await admin
          .from("business_user_locations")
          .select("location_id")
          .eq("business_user_id", membership.id)
          .eq("status", "active");

        if (assignmentError) throw assignmentError;
        const locationIds = (assignments || []).map((assignment: any) => assignment.location_id);

        if (locationIds.length === 0) {
          return res.status(200).json({ success: true, locations: [], maxLocations });
        }

        query = query.in("id", locationIds);
      }

      const { data: locations, error } = await query;
      if (error) throw error;

      return res.status(200).json({ success: true, locations: locations || [], maxLocations });
    }

    if (req.method === "POST") {
      if (!isOwner) {
        return res.status(403).json({ error: "Only the Corporate Admin can create locations" });
      }

      const name = String(payload.name || "").trim();
      if (!name) {
        return res.status(400).json({ error: "Location name is required" });
      }

      const { count, error: countError } = await admin
        .from("business_locations")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .neq("status", "inactive");

      if (countError) throw countError;
      if (Number(count || 0) >= maxLocations) {
        return res.status(403).json({ error: `Corporate location limit reached. This plan allows up to ${maxLocations} active locations.` });
      }

      const { data: location, error } = await admin
        .from("business_locations")
        .insert({
          business_id: business.id,
          name,
          address: payload.address || null,
          phone: payload.phone || null,
          email: payload.email || null,
          manager_name: payload.manager_name || null,
          status: sanitizeStatus(payload.status),
          metadata: payload.metadata || {},
        })
        .select("*")
        .single();

      if (error) throw error;
      await audit(admin, user.id, "business_location_created", location.id, { business_id: business.id, name: location.name, status: location.status });

      return res.status(201).json({ success: true, location });
    }

    if (req.method === "PATCH") {
      if (!payload.id || typeof payload.id !== "string") {
        return res.status(400).json({ error: "Location ID is required" });
      }

      const { data: canManage, error: manageError } = await admin.rpc("user_can_manage_business_location", {
        p_user_id: user.id,
        p_business_id: business.id,
        p_location_id: payload.id,
      });

      if (manageError) throw manageError;
      if (!canManage) {
        return res.status(403).json({ error: "You are not authorized to manage this location" });
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (typeof payload.name === "string") {
        const name = payload.name.trim();
        if (!name) {
          return res.status(400).json({ error: "Location name cannot be empty" });
        }
        updates.name = name;
      }

      if ("address" in payload) updates.address = payload.address || null;
      if ("phone" in payload) updates.phone = payload.phone || null;
      if ("email" in payload) updates.email = payload.email || null;
      if ("manager_name" in payload) updates.manager_name = payload.manager_name || null;
      if ("metadata" in payload) updates.metadata = payload.metadata || {};
      if ("status" in payload) updates.status = sanitizeStatus(payload.status);

      const { data: location, error } = await admin
        .from("business_locations")
        .update(updates)
        .eq("id", payload.id)
        .eq("business_id", business.id)
        .select("*")
        .single();

      if (error) throw error;
      await audit(admin, user.id, "business_location_updated", location.id, { business_id: business.id, updates });

      return res.status(200).json({ success: true, location });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    const message = error.message || "Failed to manage Corporate locations";
    const status = message.includes("Not authenticated") || message.includes("authorization") ? 401 : message.includes("Forbidden") || message.includes("not authorized") || message.includes("not enabled") ? 403 : 500;
    return res.status(status).json({ error: message });
  }
}