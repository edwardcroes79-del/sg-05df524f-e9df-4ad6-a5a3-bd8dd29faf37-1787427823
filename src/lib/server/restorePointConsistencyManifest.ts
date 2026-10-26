export const restorePointConsistencyManifestVersion = "2026-10-26.restore-point-consistency-v1";
export const restorePointConsistencyGenerator = "royalty-stamp-dr-restore-point-consistency-v1";

export type RestorePointConsistencyModel =
  | "best_effort_sequential_export"
  | "database_consistent_snapshot"
  | "cross_component_consistent_restore_point"
  | "full_project_recoverable_restore_point";

export type RestorePointConsistencyClassification =
  | "best_effort_export"
  | "internally_validated_package"
  | "database_consistent_snapshot"
  | "cross_component_consistent_restore_point"
  | "full_project_recoverable_restore_point";

export type RestorePointConsistencyEvidenceStatus =
  | "captured"
  | "verified"
  | "not_verified"
  | "blocked"
  | "requires_provider"
  | "requires_external_runbook"
  | "unsupported";

export type RestorePointConsistencyEvidence = {
  key: string;
  label: string;
  status: RestorePointConsistencyEvidenceStatus;
  details: string;
  evidence_reference?: string;
  verified_at?: string;
  blockers: string[];
};

export type RestorePointConsistencyPhaseTimings = {
  database_export_started_at: string;
  database_export_completed_at: string;
  storage_inventory_started_at: string;
  storage_inventory_completed_at: string;
  storage_download_started_at: string;
  storage_download_completed_at: string;
  package_finalization_at: string;
  package_upload_completed_at?: string;
};

export type RestorePointConsistencySummary = {
  classification: RestorePointConsistencyClassification;
  database_consistent: boolean;
  storage_consistent: boolean;
  cross_component_consistent: boolean;
  full_project_recoverable: boolean;
  supported_package_internally_validated: boolean;
  blockers: string[];
  warnings: string[];
};

export type RestorePointConsistencyManifest = {
  consistency_manifest_version: typeof restorePointConsistencyManifestVersion;
  generated_by: typeof restorePointConsistencyGenerator;
  generated_at: string;
  restore_point_id: string;
  backup_id: string;
  declared_timestamp: string;
  consistency_model: RestorePointConsistencyModel;
  phase_timings: RestorePointConsistencyPhaseTimings;
  backup_completion_state: "archive_manifest_finalized" | "completed" | "failed" | "cancelled" | "interrupted_or_unknown";
  evidence: RestorePointConsistencyEvidence[];
  summary: RestorePointConsistencySummary;
};

export type BuildRestorePointConsistencyManifestInput = {
  restorePointId: string;
  backupId: string;
  declaredTimestamp: string;
  phaseTimings: RestorePointConsistencyPhaseTimings;
  backupCompletionState?: RestorePointConsistencyManifest["backup_completion_state"];
};

export type RestorePointConsistencyManifestValidationResult = {
  valid: boolean;
  legacy: boolean;
  errors: string[];
  warnings: string[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isValidDateString(value: unknown) {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}

function evidence(
  key: string,
  label: string,
  status: RestorePointConsistencyEvidenceStatus,
  details: string,
  blockers: string[],
  evidenceReference?: string
): RestorePointConsistencyEvidence {
  return {
    key,
    label,
    status,
    details,
    evidence_reference: evidenceReference,
    blockers,
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildRestorePointConsistencyEvidence(): RestorePointConsistencyEvidence[] {
  return [
    evidence(
      "database_sequential_table_export",
      "Database table export",
      "captured",
      "Required public tables are exported sequentially through application-layer Supabase queries.",
      ["Table exports do not share a verified database transaction, snapshot identifier, or provider PITR reference."],
      "backupEngine.exportTable"
    ),
    evidence(
      "database_snapshot_reference",
      "Database snapshot reference",
      "not_verified",
      "No shared database snapshot, repeatable-read transaction, WAL position, or provider recovery reference is captured.",
      ["No shared database transaction or snapshot reference is available for this backup package."]
    ),
    evidence(
      "provider_pitr_reference",
      "Provider PITR reference",
      "not_verified",
      "No provider-supported point-in-time recovery reference has been verified by the application backup flow.",
      ["No verified provider PITR reference is recorded."]
    ),
    evidence(
      "storage_inventory",
      "Storage object inventory",
      "captured",
      "Storage bucket object paths are listed through the Storage API before object downloads in the current backup flow.",
      ["Storage inventory is not tied to a verified provider storage snapshot or object-generation marker."],
      "backupEngine.listBucketObjects"
    ),
    evidence(
      "storage_object_downloads",
      "Storage object downloads",
      "captured",
      "Storage object bytes are downloaded and checksummed after inventory listing.",
      ["Objects created, replaced, or deleted during backup are not represented by a verified storage snapshot."],
      "backupEngine.downloadStorageObject"
    ),
    evidence(
      "storage_snapshot_reference",
      "Storage snapshot or version reference",
      "not_verified",
      "No storage snapshot, generation ID, object version, or deletion tombstone mechanism is captured.",
      ["No verified Storage snapshot, generation, or versioning reference is recorded."]
    ),
    evidence(
      "database_to_storage_reference_validation",
      "Database-to-Storage reference validation",
      "not_verified",
      "The backup flow does not validate a complete graph of database rows that reference Storage objects.",
      ["No completed database-to-Storage reference validation is recorded."]
    ),
    evidence(
      "schema_database_object_recovery",
      "Schema and database-object recovery",
      "not_verified",
      "The current backup package does not include schema, indexes, constraints, functions, triggers, RLS policies, extensions, migrations, or sequence state.",
      ["Schema and database-object recovery is incomplete."]
    ),
    evidence(
      "auth_recovery",
      "Authentication recovery",
      "not_verified",
      "Supabase Auth users, identities, MFA, and provider auth state are not exported by this backup flow.",
      ["Auth recovery is not implemented or verified."]
    ),
    evidence(
      "application_operations_recovery",
      "Application, environment, and operational recovery",
      "requires_external_runbook",
      "Application source, deployment configuration, environment/secret recovery references, external integrations, webhooks, and scheduled jobs are not fully included.",
      ["Application source, environment references, and operational integrations are not fully included in the recovery package."]
    ),
    evidence(
      "package_phase_timings",
      "Backup phase timings",
      "captured",
      "The backup records actual application-observed timestamps for database export, storage inventory, storage download, and manifest finalization phases.",
      [],
      "restore_point_consistency.phase_timings"
    ),
  ];
}

export function summarizeRestorePointConsistency(evidenceItems: RestorePointConsistencyEvidence[], model: RestorePointConsistencyModel): RestorePointConsistencySummary {
  const databaseSnapshotVerified = evidenceItems.some((item) => (item.key === "database_snapshot_reference" || item.key === "provider_pitr_reference") && item.status === "verified");
  const storageSnapshotVerified = evidenceItems.some((item) => item.key === "storage_snapshot_reference" && item.status === "verified");
  const dbStorageReferencesVerified = evidenceItems.some((item) => item.key === "database_to_storage_reference_validation" && item.status === "verified");
  const schemaRecoveryVerified = evidenceItems.some((item) => item.key === "schema_database_object_recovery" && item.status === "verified");
  const authRecoveryVerified = evidenceItems.some((item) => item.key === "auth_recovery" && item.status === "verified");
  const appOpsRecoveryVerified = evidenceItems.some((item) => item.key === "application_operations_recovery" && item.status === "verified");

  const databaseConsistent = databaseSnapshotVerified;
  const storageConsistent = storageSnapshotVerified;
  const crossComponentConsistent = databaseConsistent && storageConsistent && dbStorageReferencesVerified;
  const fullProjectRecoverable = crossComponentConsistent && schemaRecoveryVerified && authRecoveryVerified && appOpsRecoveryVerified;
  const blockers = unique(evidenceItems.flatMap((item) => item.blockers.map((blocker) => `${item.label}: ${blocker}`)));

  let classification: RestorePointConsistencyClassification = "best_effort_export";
  if (fullProjectRecoverable && model === "full_project_recoverable_restore_point") {
    classification = "full_project_recoverable_restore_point";
  } else if (crossComponentConsistent && (model === "cross_component_consistent_restore_point" || model === "full_project_recoverable_restore_point")) {
    classification = "cross_component_consistent_restore_point";
  } else if (databaseConsistent && model !== "best_effort_sequential_export") {
    classification = "database_consistent_snapshot";
  }

  return {
    classification,
    database_consistent: databaseConsistent,
    storage_consistent: storageConsistent,
    cross_component_consistent: crossComponentConsistent,
    full_project_recoverable: fullProjectRecoverable,
    supported_package_internally_validated: false,
    blockers,
    warnings: [
      "This backup is a best-effort sequential export unless independently verified snapshot or provider PITR evidence is present.",
      "A valid checksum or parsed archive is not proof of historical database or cross-component consistency.",
      "A timestamp alone does not prove point-in-time recoverability.",
    ],
  };
}

export function buildRestorePointConsistencyManifest(input: BuildRestorePointConsistencyManifestInput): RestorePointConsistencyManifest {
  const evidenceItems = buildRestorePointConsistencyEvidence();
  const consistencyModel: RestorePointConsistencyModel = "best_effort_sequential_export";

  return {
    consistency_manifest_version: restorePointConsistencyManifestVersion,
    generated_by: restorePointConsistencyGenerator,
    generated_at: new Date().toISOString(),
    restore_point_id: input.restorePointId,
    backup_id: input.backupId,
    declared_timestamp: input.declaredTimestamp,
    consistency_model: consistencyModel,
    phase_timings: input.phaseTimings,
    backup_completion_state: input.backupCompletionState || "archive_manifest_finalized",
    evidence: evidenceItems,
    summary: summarizeRestorePointConsistency(evidenceItems, consistencyModel),
  };
}

export function markRestorePointConsistencyPackageCompleted<T extends { restore_point_consistency?: RestorePointConsistencyManifest }>(manifest: T, completedAt: string): T {
  if (!manifest.restore_point_consistency) return manifest;

  return {
    ...manifest,
    restore_point_consistency: {
      ...manifest.restore_point_consistency,
      phase_timings: {
        ...manifest.restore_point_consistency.phase_timings,
        package_upload_completed_at: completedAt,
      },
      backup_completion_state: "completed",
    },
  };
}

function hasVerifiedEvidence(manifest: Record<string, unknown>, key: string) {
  const entries = Array.isArray(manifest.evidence) ? manifest.evidence : [];
  return entries.some((item) => isObject(item) && item.key === key && item.status === "verified");
}

function getEvidenceStatus(manifest: Record<string, unknown>, key: string) {
  const entries = Array.isArray(manifest.evidence) ? manifest.evidence : [];
  const item = entries.find((entry) => isObject(entry) && entry.key === key);
  return isObject(item) ? item.status : undefined;
}

export function validateRestorePointConsistencyManifest(manifest: unknown, backupId: string): RestorePointConsistencyManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest) {
    return {
      valid: true,
      legacy: true,
      errors,
      warnings: ["restore_point_consistency is absent. Treating package as legacy best-effort backup with no explicit consistency evidence."],
    };
  }

  if (!isObject(manifest)) {
    return { valid: false, legacy: false, errors: ["restore_point_consistency must be an object."], warnings };
  }

  if (manifest.consistency_manifest_version !== restorePointConsistencyManifestVersion) {
    errors.push(`restore_point_consistency version is unsupported. Expected ${restorePointConsistencyManifestVersion}.`);
  }

  if (manifest.backup_id !== backupId) {
    errors.push("restore_point_consistency backup_id does not match manifest backup_id.");
  }

  if (typeof manifest.restore_point_id !== "string" || manifest.restore_point_id.trim().length === 0) {
    errors.push("restore_point_consistency restore_point_id is required.");
  }

  if (!isValidDateString(manifest.declared_timestamp)) {
    errors.push("restore_point_consistency declared_timestamp must be a valid timestamp.");
  }

  const phaseTimings = isObject(manifest.phase_timings) ? manifest.phase_timings : null;
  if (!phaseTimings) {
    errors.push("restore_point_consistency phase_timings must be an object.");
  } else {
    for (const field of ["database_export_started_at", "database_export_completed_at", "storage_inventory_started_at", "storage_inventory_completed_at", "storage_download_started_at", "storage_download_completed_at", "package_finalization_at"]) {
      if (!isValidDateString(phaseTimings[field])) {
        errors.push(`restore_point_consistency phase_timings.${field} must be a valid timestamp.`);
      }
    }
  }

  const evidenceEntries = Array.isArray(manifest.evidence) ? manifest.evidence : null;
  if (!evidenceEntries) {
    errors.push("restore_point_consistency evidence must be an array.");
  }

  const evidenceKeys = new Set<string>();
  for (const item of evidenceEntries || []) {
    if (!isObject(item)) {
      errors.push("restore_point_consistency contains a non-object evidence entry.");
      continue;
    }

    const key = typeof item.key === "string" ? item.key : "";
    if (!key) errors.push("restore_point_consistency evidence entry is missing key.");
    if (key) evidenceKeys.add(key);
    if (!["captured", "verified", "not_verified", "blocked", "requires_provider", "requires_external_runbook", "unsupported"].includes(String(item.status))) {
      errors.push(`restore_point_consistency evidence ${key || "unknown"} has invalid status.`);
    }
    if (item.status === "verified" && !isValidDateString(item.verified_at)) {
      errors.push(`restore_point_consistency evidence ${key || "unknown"} claims verified without verified_at timestamp.`);
    }
  }

  const requiredEvidenceKeys = [
    "database_sequential_table_export",
    "database_snapshot_reference",
    "provider_pitr_reference",
    "storage_inventory",
    "storage_object_downloads",
    "storage_snapshot_reference",
    "database_to_storage_reference_validation",
    "schema_database_object_recovery",
    "auth_recovery",
    "application_operations_recovery",
    "package_phase_timings",
  ];

  const missingEvidence = requiredEvidenceKeys.filter((key) => !evidenceKeys.has(key));
  if (missingEvidence.length > 0) {
    errors.push(`restore_point_consistency is missing required evidence entries: ${missingEvidence.join(", ")}.`);
  }

  const model = manifest.consistency_model;
  const databaseEvidenceVerified = hasVerifiedEvidence(manifest, "database_snapshot_reference") || hasVerifiedEvidence(manifest, "provider_pitr_reference");
  const storageEvidenceVerified = hasVerifiedEvidence(manifest, "storage_snapshot_reference");
  const referenceEvidenceVerified = hasVerifiedEvidence(manifest, "database_to_storage_reference_validation");
  const schemaEvidenceVerified = hasVerifiedEvidence(manifest, "schema_database_object_recovery");
  const authEvidenceVerified = hasVerifiedEvidence(manifest, "auth_recovery");
  const appOpsEvidenceVerified = hasVerifiedEvidence(manifest, "application_operations_recovery");

  if (model === "best_effort_sequential_export") {
    if (databaseEvidenceVerified) {
      errors.push("restore_point_consistency best-effort export must not include verified database snapshot evidence.");
    }
  } else if (model === "database_consistent_snapshot") {
    if (!databaseEvidenceVerified) errors.push("restore_point_consistency claims database consistency without verified database snapshot or provider PITR evidence.");
  } else if (model === "cross_component_consistent_restore_point") {
    if (!databaseEvidenceVerified) errors.push("restore_point_consistency claims cross-component consistency without verified database consistency evidence.");
    if (!storageEvidenceVerified) errors.push("restore_point_consistency claims cross-component consistency without verified Storage snapshot/version evidence.");
    if (!referenceEvidenceVerified) errors.push("restore_point_consistency claims cross-component consistency without verified database-to-Storage reference validation.");
  } else if (model === "full_project_recoverable_restore_point") {
    if (!databaseEvidenceVerified || !storageEvidenceVerified || !referenceEvidenceVerified || !schemaEvidenceVerified || !authEvidenceVerified || !appOpsEvidenceVerified) {
      errors.push("restore_point_consistency claims full-project recoverability without verified evidence for every required recovery component.");
    }
  } else {
    errors.push("restore_point_consistency consistency_model is unsupported.");
  }

  const summary = isObject(manifest.summary) ? manifest.summary : null;
  if (!summary) {
    errors.push("restore_point_consistency summary must be an object.");
  } else {
    if (summary.database_consistent === true && !databaseEvidenceVerified) {
      errors.push("restore_point_consistency summary falsely claims database consistency.");
    }
    if (summary.storage_consistent === true && !storageEvidenceVerified) {
      errors.push("restore_point_consistency summary falsely claims Storage consistency.");
    }
    if (summary.cross_component_consistent === true && (!databaseEvidenceVerified || !storageEvidenceVerified || !referenceEvidenceVerified)) {
      errors.push("restore_point_consistency summary falsely claims cross-component consistency.");
    }
    if (summary.full_project_recoverable === true && (!databaseEvidenceVerified || !storageEvidenceVerified || !referenceEvidenceVerified || !schemaEvidenceVerified || !authEvidenceVerified || !appOpsEvidenceVerified)) {
      errors.push("restore_point_consistency summary falsely claims full-project recoverability.");
    }
  }

  if (model === "best_effort_sequential_export") {
    const dbStatus = getEvidenceStatus(manifest, "database_snapshot_reference");
    const storageStatus = getEvidenceStatus(manifest, "storage_snapshot_reference");
    if (dbStatus !== "not_verified" || storageStatus !== "not_verified") {
      warnings.push("restore_point_consistency best-effort export should keep snapshot evidence unverified unless stronger provider evidence is implemented.");
    }
  }

  return {
    valid: errors.length === 0,
    legacy: false,
    errors,
    warnings,
  };
}