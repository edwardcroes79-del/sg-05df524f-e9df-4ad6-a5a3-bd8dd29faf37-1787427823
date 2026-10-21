import crypto from "crypto";

export const maxValidationUploadBytes = 250 * 1024 * 1024;
export const maxValidationUploadMegabytes = maxValidationUploadBytes / 1024 / 1024;
export const validationUploadChunkBytes = 3 * 1024 * 1024;
export const validationUploadPrefix = "validation-uploads";
export const validationUploadTtlMs = 2 * 60 * 60 * 1000;
export const staleValidationUploadMs = 24 * 60 * 60 * 1000;

export type ValidationUploadTokenPayload = {
  adminUserId: string;
  storagePrefix: string;
  fileName: string;
  fileSizeBytes: number;
  expectedChunks: number;
  expiresAt: number;
};

function getSigningSecret() {
  const secret = process.env.BACKUP_UPLOAD_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Backup upload signing secret is not configured.");
  }
  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string) {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function safeBackupUploadFileName(value: string) {
  return decodeURIComponent(value || "uploaded-backup.tar.gz").replace(/[^\w.\-() ]/g, "_");
}

export function isPlausibleBackupFileName(fileName: string) {
  return decodeURIComponent(fileName || "").trim().toLowerCase().includes(".tar.gz");
}

export function isAllowedBackupUploadContentType(contentType: string) {
  const normalized = contentType.toLowerCase();
  return (
    normalized === "" ||
    normalized.includes("gzip") ||
    normalized.includes("octet-stream") ||
    normalized.includes("x-tar") ||
    normalized.includes("tar")
  );
}

export function createValidationUploadToken(payload: ValidationUploadTokenPayload) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyValidationUploadToken(token: string): ValidationUploadTokenPayload {
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Invalid backup upload token.");
  }

  const expectedSignature = signPayload(encodedPayload);
  const expected = Buffer.from(expectedSignature, "base64url");
  const actual = Buffer.from(signature, "base64url");

  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error("Invalid backup upload token.");
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload)) as ValidationUploadTokenPayload;

  if (!payload.storagePrefix || !payload.adminUserId || !payload.fileName || !payload.fileSizeBytes || !payload.expectedChunks || !payload.expiresAt) {
    throw new Error("Invalid backup upload token payload.");
  }

  if (Date.now() > payload.expiresAt) {
    throw new Error("Backup upload token expired. Start the upload again.");
  }

  return payload;
}

export function getValidationChunkPath(storagePrefix: string, chunkIndex: number) {
  return `${storagePrefix}/chunks/${String(chunkIndex).padStart(6, "0")}.part`;
}

export function getValidationChunkIndex(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Invalid backup upload chunk index.");
  }
  return parsed;
}