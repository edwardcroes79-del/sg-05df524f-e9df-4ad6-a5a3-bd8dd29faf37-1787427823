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
  logo?: {
    data?: string | null;
    type?: string | null;
    name?: string | null;
  } | null;
  logoUrl?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

export type ValidatedLogoUpload = {
  buffer: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  extension: "png" | "jpg" | "webp";
  size: number;
};

export type OptimizedLogoUpload = {
  buffer: Buffer;
  mimeType: "image/webp";
  extension: "webp";
  size: number;
};

export const ROYALTY_STAMP_DEFAULT_BRANDING = {
  logo_url: null,
  primary_color: "#F87171",
  secondary_color: "#0F766E",
} as const;

export const MAX_LOGO_BYTES = 1024 * 1024;
export const MAX_OPTIMIZED_LOGO_BYTES = 512 * 1024;
export const MAX_LOGO_DIMENSION = 512;
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function normalizeHexColor(value: string | null | undefined) {
  if (!value) return null;

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
  const dataUrlMatch = trimmed.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i);
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

  throw new Error("Unsupported logo file type");
}

function hasValidMagicNumber(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }

  return false;
}

export function sanitizeBrandingPayload(payload: CorporateBrandingPayload) {
  return {
    businessId: typeof payload.business_id === "string" ? payload.business_id : undefined,
    primaryColor: normalizeHexColor(payload.primary_color || payload.primaryColor),
    secondaryColor: normalizeHexColor(payload.secondary_color || payload.secondaryColor),
  };
}

export function validateLogoUpload(payload: CorporateBrandingPayload): ValidatedLogoUpload | null {
  const logoBase64 = payload.logo_base64 || payload.logo?.data;

  if (!logoBase64) {
    return null;
  }

  const mimeType = String(payload.logo_mime_type || payload.logo?.type || "").toLowerCase();
  if (!ALLOWED_LOGO_TYPES.has(mimeType)) {
    throw new Error("Logo must be PNG, JPG, or WEBP");
  }

  const buffer = decodeBase64Logo(logoBase64);
  if (buffer.byteLength > MAX_LOGO_BYTES) {
    throw new Error("Logo file must be 1MB or smaller");
  }

  if (buffer.byteLength < 32 || !hasValidMagicNumber(buffer, mimeType)) {
    throw new Error("Logo file is invalid");
  }

  return {
    buffer,
    mimeType: mimeType as ValidatedLogoUpload["mimeType"],
    extension: extensionFromMimeType(mimeType),
    size: buffer.byteLength,
  };
}

export async function optimizeLogoUpload(upload: ValidatedLogoUpload): Promise<OptimizedLogoUpload> {
  const sharp = (await import("sharp")).default;
  const optimized = await sharp(upload.buffer, { animated: false })
    .rotate()
    .resize({
      width: MAX_LOGO_DIMENSION,
      height: MAX_LOGO_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  if (optimized.byteLength > MAX_OPTIMIZED_LOGO_BYTES) {
    throw new Error("Optimized logo file must be 512KB or smaller");
  }

  return {
    buffer: optimized,
    mimeType: "image/webp",
    extension: "webp",
    size: optimized.byteLength,
  };
}

export function buildCorporateLogoPath(businessId: string) {
  const timestamp = Date.now();
  return `${businessId}/corporate-branding/logo-${timestamp}.webp`;
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