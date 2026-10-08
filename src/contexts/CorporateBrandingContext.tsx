import React, { createContext, useContext } from "react";

export type CorporateBrandingSettings = {
  business_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
};

export const DEFAULT_CORPORATE_BRANDING: CorporateBrandingSettings = {
  business_id: "",
  logo_url: null,
  primary_color: "#F87171",
  secondary_color: "#0F766E",
};

type CorporateBrandingContextValue = {
  branding: CorporateBrandingSettings | null;
};

export type CorporateBrandingFetchResult = {
  status: "available" | "unavailable";
  branding: CorporateBrandingSettings;
};

const CorporateBrandingContext = createContext<CorporateBrandingContextValue>({
  branding: null,
});

export function CorporateBrandingProvider({
  value,
  children,
}: {
  value: CorporateBrandingSettings | null;
  children: React.ReactNode;
}) {
  return (
    <CorporateBrandingContext.Provider value={{ branding: value }}>
      {children}
    </CorporateBrandingContext.Provider>
  );
}

export function useCorporateBranding() {
  return useContext(CorporateBrandingContext);
}

function hexToHslTriple(hexColor: string) {
  const hex = hexColor.replace("#", "");
  const normalized = hex.length === 3
    ? hex.split("").map((character) => character + character).join("")
    : hex;

  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === red) {
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }

    hue /= 6;
  }

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function getDefaultCorporateBranding(businessId = ""): CorporateBrandingSettings {
  return {
    ...DEFAULT_CORPORATE_BRANDING,
    business_id: businessId,
  };
}

export function getCorporateBrandingStyle(branding: CorporateBrandingSettings | null) {
  if (!branding) return undefined;

  return {
    "--primary": hexToHslTriple(branding.primary_color),
    "--ring": hexToHslTriple(branding.primary_color),
    "--accent": hexToHslTriple(branding.secondary_color),
  } as React.CSSProperties;
}

async function readErrorMessage(response: Response) {
  try {
    const body = await response.json();
    return typeof body?.error === "string" ? body.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

function isFeatureUnavailableResponse(response: Response, message: string) {
  return response.status === 403 && message === "Corporate Branding is not available for this business";
}

export async function fetchCorporateBranding(businessId: string, accessToken: string): Promise<CorporateBrandingFetchResult> {
  const response = await fetch(`/api/business/corporate-branding?business_id=${businessId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);

    if (isFeatureUnavailableResponse(response, message)) {
      return {
        status: "unavailable",
        branding: getDefaultCorporateBranding(businessId),
      };
    }

    throw new Error(message || "Unable to load Corporate Branding");
  }

  const result = await response.json();
  return {
    status: "available",
    branding: (result.branding as CorporateBrandingSettings) || getDefaultCorporateBranding(businessId),
  };
}