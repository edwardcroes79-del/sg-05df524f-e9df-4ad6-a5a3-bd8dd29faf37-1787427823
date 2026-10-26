import crypto from "crypto";
import type { BackupManifest } from "@/lib/server/backupConfig";
import type { StoredBackupVerificationReport, StoredBackupVerificationStatus } from "@/lib/server/backupStoredPackageVerification";

export const backupVerificationEvidenceVersion = "2026-10-26.backup-verification-evidence-v1";
export const backupVerificationEvidenceValidatorVersion = "royalty-stamp-stored-package-validator-v1";

export type BackupVerificationEvidenceStatus = "verified" | "failed" | "incomplete" | "not_verified";
export type BackupVerificationEvidencePersistenceStatus = "persisted" | "not_persisted" | "blocked";

export type BackupVerificationEvidenceCheckOutcome = {
  name: string;
  status: "passed" | "failed" | "warning" | "not_verified" | "blocked";
  details: string;
};

export type BackupVerificationEvidenceRecord = {
  evidence_schema_version: typeof backupVerificationEvidenceVersion;
  evidence_record_id: string;
  backup_job_id: string;
  restore_point_id: string | null;
  package_id: string | null;
  package_integrity_status: BackupVerificationEvidenceStatus;
  verification_method: "stored_package_download_and_archive_validation";
  validator_version: typeof backupVerificationEvidenceValidatorVersion;
  verification_started_at: string | null;
  verification_completed_at: string | null;
  package_checksum_verified: boolean;
  package_sha256_expected_available: boolean;
  package_size_bytes_expected: number | null;
  package_size_bytes_verified: number | null;
  manifest_version: string | null;
  consistency_classification: string;
  historical_consistency_status: "not_verified";
  full_project_recovery_status: "blocked";
  required_table_validation: {
    status: BackupVerificationEvidenceStatus;
    total_records_verified?: number;
  };
  required_bucket_validation: {
    status: BackupVerificationEvidenceStatus;
    total_storage_files_verified?: number;
  };
  multipart_package_validation: {
    status: BackupVerificationEvidenceStatus;
    details: string;
  };
  error_codes: string[];
  failure_explanations: string[];
  missing_evidence: string[];
  limitations: string[];
  checks: BackupVerificationEvidenceCheckOutcome[];
  persistence: {
    status: BackupVerificationEvidencePersistenceStatus;
    mechanism: "none_authorized" | "existing_manifest_field" | "future_authorized_store";
    details: string;
  };
};

export type BackupVerificationEvidenceSummary = {
  status: BackupVerificationEvidenceStatus;
  evidence_available: boolean;
  evidence_schema_version: string | null;
  evidence_record_id: string | null;
  verification_completed_at: string | null;
  validator_version: string | null;
  package_sha256_verified: boolean;
  package_size_bytes_verified: number | null;
  consistency_not_inferred: true;
  full_project_recovery_not_inferred: true;
  persistence_status: BackupVerificationEvidencePersistenceStatus;
  warnings: string[];
  blockers: string[];
};

export type BackupVerificationEvidenceValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

function hashEvidenceId(parts: string[]) {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

function mapVerificationStatus(status: StoredBackupVerificationStatus): BackupVerificationEvidenceStatus {
  if (status === "VALIDATED") return "verified";
  if (status === "INVALID") return "failed";
  if (status === "INCOMPLETE" || status === "BLOCKED") return "incomplete";
  return "not_verified";
}

function checkStatusToEvidenceStatus(status: string | undefined): BackupVerificationEvidenceStatus {
  if (status === "passed" || status === "warning") return "verified";
  if (status === "failed") return "failed";
  if (status === "blocked") return "incomplete";
  return "not_verified";
}

function concise(value: string) {
  return value.replace(/service[_-]?role/gi, "[redacted-role]").replace(/token/gi, "[redacted-token]").replace(/password/gi, "[redacted-password]").slice(0, 280);
}

function collectErrorCodes(report: StoredBackupVerificationReport) {
  if (report.status === "VALIDATED") return [];
  return report.errors.length > 0 ? report.errors.map((_, index) => `${report.status.toLowerCase()}_${index + 1}`) : [report.status.toLowerCase()];
}

function packagePartsDetails(report: StoredBackupVerificationReport) {
  const packagePartsCheck = report.checks.find((check) => check.name === "Package parts");
  if (!packagePartsCheck) {
    return { status: "not_verified" as BackupVerificationEvidenceStatus, details: "Multipart package metadata was not present in the verification report." };
  }

  return {
    status: checkStatusToEvidenceStatus(packagePartsCheck.status),
    details: packagePartsCheck.details,
  };
}

export function buildBackupVerificationEvidenceRecord(report: StoredBackupVerificationReport): BackupVerificationEvidenceRecord {
  const packageIntegrityStatus = mapVerificationStatus(report.status);
  const restorePointId = report.validation?.backup_id || report.manifest_backup_id || null;
  const evidenceRecordId = `bve_${hashEvidenceId([
    report.backup_id,
    report.generated_at,
    report.status,
    String(report.package_sha256_verified),
    String(report.package_size_bytes_retrieved ?? ""),
  ])}`;

  return {
    evidence_schema_version: backupVerificationEvidenceVersion,
    evidence_record_id: evidenceRecordId,
    backup_job_id: report.backup_id,
    restore_point_id: restorePointId,
    package_id: report.manifest_backup_id || report.backup_id,
    package_integrity_status: packageIntegrityStatus,
    verification_method: "stored_package_download_and_archive_validation",
    validator_version: backupVerificationEvidenceValidatorVersion,
    verification_started_at: null,
    verification_completed_at: report.generated_at,
    package_checksum_verified: report.package_sha256_verified,
    package_sha256_expected_available: report.package_sha256_expected_available,
    package_size_bytes_expected: report.package_size_bytes_expected ?? null,
    package_size_bytes_verified: report.package_size_bytes_retrieved ?? null,
    manifest_version: report.package_version || null,
    consistency_classification: report.restore_point_consistency_summary?.classification || "not_verified",
    historical_consistency_status: "not_verified",
    full_project_recovery_status: "blocked",
    required_table_validation: {
      status: report.validation?.valid ? "verified" : packageIntegrityStatus === "failed" ? "failed" : "not_verified",
      total_records_verified: report.total_records_verified,
    },
    required_bucket_validation: {
      status: report.validation?.valid ? "verified" : packageIntegrityStatus === "failed" ? "failed" : "not_verified",
      total_storage_files_verified: report.total_storage_files_verified,
    },
    multipart_package_validation: packagePartsDetails(report),
    error_codes: collectErrorCodes(report),
    failure_explanations: report.errors.map(concise),
    missing_evidence: [
      "No evidence record persistence mechanism is authorized in the current task.",
      "Verification evidence records do not prove current package integrity after the recorded verification time.",
      "Package integrity verification does not prove historical database, Storage, Auth, schema, or full-project recoverability.",
    ],
    limitations: [
      "This evidence documents one stored-package verification event only.",
      "The Schema Recovery Review endpoint must not download or revalidate archives automatically.",
      "No historical consistency or full-project recovery claim is derived from package integrity checks.",
    ],
    checks: report.checks.map((check) => ({
      name: check.name,
      status: check.status,
      details: concise(check.details),
    })),
    persistence: {
      status: "not_persisted",
      mechanism: "none_authorized",
      details: "No existing authorized persistence mechanism for verification evidence was found; no database schema change or write path was introduced.",
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isValidEvidenceStatus(value: unknown): value is BackupVerificationEvidenceStatus {
  return value === "verified" || value === "failed" || value === "incomplete" || value === "not_verified";
}

function containsSensitiveText(value: unknown): boolean {
  const text = JSON.stringify(value || "").toLowerCase();
  return text.includes("service_role") || text.includes("service-role") || text.includes("supabase_service_role_key") || text.includes("password=") || text.includes("authorization: bearer");
}

export function validateBackupVerificationEvidenceRecord(record: unknown, backupId?: string): BackupVerificationEvidenceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!record) return { valid: true, errors, warnings: ["Stored backup verification evidence is absent. Status is not_verified."] };
  if (!isObject(record)) return { valid: false, errors: ["backup verification evidence must be an object."], warnings };

  if (record.evidence_schema_version !== backupVerificationEvidenceVersion) {
    errors.push(`backup verification evidence version is unsupported. Expected ${backupVerificationEvidenceVersion}.`);
  }

  if (backupId && record.backup_job_id !== backupId) {
    errors.push("backup verification evidence backup_job_id does not match the backup job.");
  }

  if (typeof record.evidence_record_id !== "string" || !record.evidence_record_id.startsWith("bve_")) {
    errors.push("backup verification evidence_record_id is missing or malformed.");
  }

  if (!isValidEvidenceStatus(record.package_integrity_status)) {
    errors.push("backup verification evidence package_integrity_status is unsupported.");
  }

  if (record.historical_consistency_status !== "not_verified") {
    errors.push("backup verification evidence must not infer historical consistency from package integrity.");
  }

  if (record.full_project_recovery_status !== "blocked") {
    errors.push("backup verification evidence must not infer full-project recovery from package integrity.");
  }

  if (record.package_integrity_status === "verified" && record.package_checksum_verified !== true) {
    errors.push("backup verification evidence claims verified package integrity without package checksum verification.");
  }

  if (containsSensitiveText(record)) {
    errors.push("backup verification evidence contains sensitive credential-like text.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function extractBackupVerificationEvidenceFromManifest(manifest?: BackupManifest | null, backupId?: string): BackupVerificationEvidenceRecord | null {
  const candidate = (manifest as unknown as { backup_verification_evidence?: unknown } | null | undefined)?.backup_verification_evidence;
  if (!candidate) return null;
  const validation = validateBackupVerificationEvidenceRecord(candidate, backupId);
  if (!validation.valid) return null;
  return candidate as BackupVerificationEvidenceRecord;
}

export function summarizeBackupVerificationEvidence(record?: BackupVerificationEvidenceRecord | null): BackupVerificationEvidenceSummary {
  if (!record) {
    return {
      status: "not_verified",
      evidence_available: false,
      evidence_schema_version: null,
      evidence_record_id: null,
      verification_completed_at: null,
      validator_version: null,
      package_sha256_verified: false,
      package_size_bytes_verified: null,
      consistency_not_inferred: true,
      full_project_recovery_not_inferred: true,
      persistence_status: "blocked",
      warnings: ["No persisted stored-package verification evidence is available for review."],
      blockers: ["Persistence for verification evidence requires an authorized storage mechanism before the review center can retrieve prior outcomes."],
    };
  }

  return {
    status: record.package_integrity_status,
    evidence_available: true,
    evidence_schema_version: record.evidence_schema_version,
    evidence_record_id: record.evidence_record_id,
    verification_completed_at: record.verification_completed_at,
    validator_version: record.validator_version,
    package_sha256_verified: record.package_checksum_verified,
    package_size_bytes_verified: record.package_size_bytes_verified,
    consistency_not_inferred: true,
    full_project_recovery_not_inferred: true,
    persistence_status: record.persistence.status,
    warnings: [
      "Stored-package verification evidence reflects only the recorded verification event.",
      "Successful package verification does not prove historical consistency or full-project recoverability.",
      ...record.limitations,
    ],
    blockers: record.missing_evidence,
  };
}