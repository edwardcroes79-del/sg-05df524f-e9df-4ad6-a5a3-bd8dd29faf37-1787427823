import { supabase } from "@/integrations/supabase/client";

export interface MfaRouteRequirement {
  required: boolean;
  factorId: string | null;
}

export function normalizeInternalReturnPath(value: string | string[] | undefined): string | null {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) {
    return null;
  }

  try {
    const decodedValue = decodeURIComponent(rawValue);

    if (!decodedValue.startsWith("/") || decodedValue.startsWith("//") || decodedValue.includes("\\")) {
      return null;
    }

    if (decodedValue.toLowerCase().startsWith("/auth/login")) {
      return null;
    }

    return decodedValue;
  } catch {
    return null;
  }
}

export async function getMfaRouteRequirement(): Promise<MfaRouteRequirement> {
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

  if (factorsError) {
    return {
      required: false,
      factorId: null,
    };
  }

  const verifiedTotpFactor = (factors?.totp ?? []).find((factor: any) => factor.status === "verified");

  if (!verifiedTotpFactor) {
    return {
      required: false,
      factorId: null,
    };
  }

  const { data: assuranceLevel, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (assuranceError) {
    return {
      required: true,
      factorId: verifiedTotpFactor.id,
    };
  }

  return {
    required: assuranceLevel?.currentLevel !== "aal2",
    factorId: verifiedTotpFactor.id,
  };
}

export function buildMfaRedirect(path: string): string {
  return `/auth/login?mfa=required&returnUrl=${encodeURIComponent(path)}`;
}