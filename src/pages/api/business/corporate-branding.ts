import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  buildCorporateLogoPath,
  optimizeLogoUpload,
  sanitizeBrandingPayload,
  toBrandingSettings,
  validateLogoUpload,
  type CorporateBrandingPayload,
} from "@/services/corporateBrandingService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const bucketName = "loyalty-assets";

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

async function hasCorporateBrandingEntitlement(admin: ReturnType<typeof createServiceClient>, business: { id: string; subscription_plan: string | null }) {
  const { data, error } = await admin
    .from("plan_entitlements")
    .select("boolean_value")
    .eq("plan_id", business.subscription_plan)
    .eq("key", "corporate_branding")
    .eq("value_type", "boolean")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.boolean_value);
}

async function userCanManageCorporateBranding(admin: ReturnType<typeof createServiceClient>, businessId: string, userId: string) {
  const { data, error } = await admin.rpc("is_corporate_admin_for_business", {
    target_business_id: businessId,
    target_user_id: userId,
  });

  if (error) throw error;
  return Boolean(data);
}

async function resolveCorporateBusiness(admin: ReturnType<typeof createServiceClient>, userId: string, requestedBusinessId?: string) {
  let query = admin
    .from("businesses")
    .select("id, owner_id, business_name, subscription_plan, logo, primary_color, secondary_color");

  if (requestedBusinessId) {
    query = query.eq("id", requestedBusinessId);
  } else {
    query = query.eq("owner_id", userId);
  }

  const { data: business, error } = await query.maybeSingle();
  if (error) throw error;

  if (!business) {
    throw new Error("Business access required");
  }

  if (business.owner_id !== userId) {
    const { data: membership, error: membershipError } = await admin
      .from("business_users")
      .select("id, role, status")
      .eq("business_id", business.id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership) {
      throw new Error("Forbidden: You do not have access to this business");
    }
  }

  const canUseCorporateBranding = await hasCorporateBrandingEntitlement(admin, business);
  if (!canUseCorporateBranding) {
    throw new Error("Corporate Branding is available for Corporate businesses only");
  }

  return business;
}

async function audit(admin: ReturnType<typeof createServiceClient>, userId: string, targetId: string, metadata: Record<string, unknown>) {
  await admin.from("audit_logs").insert({
    admin_user_id: userId,
    action: "corporate_branding_updated",
    target_type: "business",
    target_id: targetId,
    metadata,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET" && req.method !== "PUT") {
      res.setHeader("Allow", "GET, PUT");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const admin = createServiceClient();
    const user = await getAuthenticatedUser(req);
    const payload = (req.method === "GET" ? req.query : req.body) as CorporateBrandingPayload;
    const { businessId, primaryColor, secondaryColor } = sanitizeBrandingPayload(payload);
    const business = await resolveCorporateBusiness(admin, user.id, businessId);

    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        branding: toBrandingSettings(business),
      });
    }

    const canManageBranding = await userCanManageCorporateBranding(admin, business.id, user.id);
    if (!canManageBranding) {
      return res.status(403).json({ error: "Only Corporate admins can update Corporate Branding" });
    }

    const logoUpload = validateLogoUpload(payload);
    let logoUrl = business.logo || null;
    let logoPath: string | null = null;
    let logoSize: number | null = null;

    if (logoUpload) {
      const optimizedLogo = await optimizeLogoUpload(logoUpload);
      logoPath = buildCorporateLogoPath(business.id, optimizedLogo.extension);
      logoSize = optimizedLogo.size;

      const { error: uploadError } = await admin.storage
        .from(bucketName)
        .upload(logoPath, optimizedLogo.buffer, {
          contentType: optimizedLogo.mimeType,
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = admin.storage.from(bucketName).getPublicUrl(logoPath);
      logoUrl = publicUrl.publicUrl;
    }

    const { data: updatedBusiness, error: updateError } = await admin
      .from("businesses")
      .update({
        logo: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      })
      .eq("id", business.id)
      .select("id, logo, primary_color, secondary_color")
      .single();

    if (updateError) throw updateError;

    await audit(admin, user.id, business.id, {
      business_id: business.id,
      logo_path: logoPath,
      logo_size: logoSize,
      has_logo_upload: Boolean(logoUpload),
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    });

    return res.status(200).json({
      success: true,
      branding: toBrandingSettings(updatedBusiness),
    });
  } catch (error: any) {
    const message = error.message || "Failed to manage Corporate Branding";
    const status = message.includes("Not authenticated") || message.includes("authorization")
      ? 401
      : message.includes("Forbidden") || message.includes("access") || message.includes("Corporate")
        ? 403
        : message.includes("Logo") || message.includes("color")
          ? 400
          : 500;

    return res.status(status).json({ error: message });
  }
}