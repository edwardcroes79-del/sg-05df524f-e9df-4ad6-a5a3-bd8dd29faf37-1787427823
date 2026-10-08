export type CorporateBrandingSettings = {
  business_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
};

export type CorporateBrandingPayload = {
  business_id?: string;
  logo_base64?: string | null;
  logo_mime_type?: string | null;
  logo_file_name?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

export type ValidatedLogoUpload = {
  buffer: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";
  extension: "png" | "jpg" | "webp" | "svg";
  size: number;
};

export const ROYALTY_STAMP_DEFAULT_BRANDING = {
  logo_url: null,
  primary_color: "#F87171",
  secondary_color: "#0F766E",
} as const;

const MAX_LOGO_BYTES = 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;

  const trimmed = value.trim();
  const shortHex = /^#([0-9a-fA-F]{3})$/;
  const fullHex = /^#([0-9a-fA-F]{6})$/;

  if (fullHex.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const shortMatch = trimmed.match(shortHex);
  if (shortMatch) {
    const expanded = shortMatch[1]
      .split("")
      .map((character) => character + character)
      .join("");

    return `#${expanded}`.toUpperCase();
  }

  throw new Error("Brand colors must be valid hex values");
}

function decodeBase64Logo(logoBase64: string) {
  const trimmed = logoBase64.trim();
  const dataUrlMatch = trimmed.match(/^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,(.+)$/i);
  const encoded = dataUrlMatch ? dataUrlMatch[2] : trimmed;

  if (!encoded || encoded.length > MAX_LOGO_BYTES * 2) {
    throw new Error("Logo file is too large");
  }

  return Buffer.from(encoded, "base64");
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/svg+xml") return "svg";

  throw new Error("Unsupported logo file type");
}

export function sanitizeBrandingPayload(payload: CorporateBrandingPayload) {
  return {
    businessId: typeof payload.business_id === "string" ? payload.business_id : undefined,
    primaryColor: normalizeHexColor(payload.primary_color, ROYALTY_STAMP_DEFAULT_BRANDING.primary_color),
    secondaryColor: normalizeHexColor(payload.secondary_color, ROYALTY_STAMP_DEFAULT_BRANDING.secondary_color),
  };
}

export function validateLogoUpload(payload: CorporateBrandingPayload): ValidatedLogoUpload | null {
  if (!payload.logo_base64) {
    return null;
  }

  const mimeType = String(payload.logo_mime_type || "").toLowerCase();
  if (!ALLOWED_LOGO_TYPES.has(mimeType)) {
    throw new Error("Logo must be PNG, JPG, WEBP, or SVG");
  }

  const buffer = decodeBase64Logo(payload.logo_base64);
  if (buffer.byteLength > MAX_LOGO_BYTES) {
    throw new Error("Logo file must be 1MB or smaller");
  }

  if (buffer.byteLength < 32) {
    throw new Error("Logo file is invalid");
  }

  return {
    buffer,
    mimeType: mimeType as ValidatedLogoUpload["mimeType"],
    extension: extensionFromMimeType(mimeType),
    size: buffer.byteLength,
  };
}

export function buildCorporateLogoPath(businessId: string, extension: ValidatedLogoUpload["extension"]) {
  const timestamp = Date.now();
  return `corporate-branding/${businessId}/logo-${timestamp}.${extension}`;
}

export function toBrandingSettings(row: {
  id: string;
  logo: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}): CorporateBrandingSettings {
  return {
    business_id: row.id,
    logo_url: row.logo || ROYALTY_STAMP_DEFAULT_BRANDING.logo_url,
    primary_color: row.primary_color || ROYALTY_STAMP_DEFAULT_BRANDING.primary_color,
    secondary_color: row.secondary_color || ROYALTY_STAMP_DEFAULT_BRANDING.secondary_color,
  };
}