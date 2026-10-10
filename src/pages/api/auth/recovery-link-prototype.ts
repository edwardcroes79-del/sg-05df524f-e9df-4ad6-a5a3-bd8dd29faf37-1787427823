import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type RecoveryPrototypeResponse = {
  success: boolean;
  enabled: boolean;
  generated?: boolean;
  redirectTo?: string;
  errorCategory?: string;
};

const CANONICAL_RECOVERY_REDIRECT = "https://royaltystamp.com/auth/update-password";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getHeaderValue(req: NextApiRequest, name: string): string {
  const value = req.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return typeof value === "string" ? value : "";
}

function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production";
}

function isPrototypeEnabled(): boolean {
  return process.env.PASSWORD_RECOVERY_PROTOTYPE_ENABLED === "true" && !isProductionRuntime();
}

function categorizeRecoveryLinkError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("rate limit")) {
    return "rate_limit";
  }

  if (message.includes("not found") || message.includes("user")) {
    return "user_lookup_or_policy";
  }

  if (message.includes("redirect")) {
    return "redirect_not_allowed";
  }

  if (message.includes("service") || message.includes("permission") || message.includes("jwt")) {
    return "admin_client_configuration";
  }

  return "provider_error";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecoveryPrototypeResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      enabled: isPrototypeEnabled(),
      errorCategory: "method_not_allowed",
    });
  }

  if (!isPrototypeEnabled()) {
    return res.status(404).json({
      success: false,
      enabled: false,
      errorCategory: "prototype_disabled",
    });
  }

  const configuredSecret = process.env.PASSWORD_RECOVERY_PROTOTYPE_SECRET;
  const configuredEmail = normalizeEmail(process.env.PASSWORD_RECOVERY_PROTOTYPE_EMAIL);
  const suppliedSecret = getHeaderValue(req, "x-recovery-prototype-secret");
  const requestedEmail = normalizeEmail(req.body?.email);

  if (!configuredSecret || !configuredEmail) {
    return res.status(503).json({
      success: false,
      enabled: true,
      errorCategory: "prototype_not_configured",
    });
  }

  if (!suppliedSecret || suppliedSecret !== configuredSecret) {
    return res.status(401).json({
      success: false,
      enabled: true,
      errorCategory: "unauthorized",
    });
  }

  if (!requestedEmail || requestedEmail !== configuredEmail) {
    return res.status(403).json({
      success: false,
      enabled: true,
      errorCategory: "synthetic_account_mismatch",
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({
      success: false,
      enabled: true,
      errorCategory: "admin_client_configuration",
    });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: requestedEmail,
      options: {
        redirectTo: CANONICAL_RECOVERY_REDIRECT,
      },
    });

    if (error) {
      return res.status(502).json({
        success: false,
        enabled: true,
        generated: false,
        redirectTo: CANONICAL_RECOVERY_REDIRECT,
        errorCategory: categorizeRecoveryLinkError(error),
      });
    }

    const actionLinkGenerated = Boolean(data?.properties?.action_link);

    return res.status(actionLinkGenerated ? 200 : 502).json({
      success: actionLinkGenerated,
      enabled: true,
      generated: actionLinkGenerated,
      redirectTo: CANONICAL_RECOVERY_REDIRECT,
      errorCategory: actionLinkGenerated ? undefined : "missing_action_link",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      enabled: true,
      generated: false,
      redirectTo: CANONICAL_RECOVERY_REDIRECT,
      errorCategory: categorizeRecoveryLinkError(error),
    });
  }
}