export const completeRecoveryManifestVersion = "2026-10-26.complete-recovery-v1";
export const completeRecoveryManifestGenerator = "royalty-stamp-dr-complete-recovery-manifest-v1";

export type CompleteRecoveryComponentStatus =
  | "captured"
  | "verified"
  | "unsupported"
  | "requires_provider"
  | "requires_external_runbook"
  | "not_verified";

export type CompleteRecoveryComponentGroup =
  | "database"
  | "authentication"
  | "storage"
  | "application"
  | "operations"
  | "package_integrity";

export type CompleteRecoveryEvidence = {
  kind: string;
  status: "captured" | "verified" | "not_verified" | "unsupported";
  reference: string;
  details: string;
};

export type CompleteRecoveryComponent = {
  key: string;
  group: CompleteRecoveryComponentGroup;
  label: string;
  required_for_full_project_recovery: boolean;
  status: CompleteRecoveryComponentStatus;
  recovery_method_supported: boolean;
  evidence: CompleteRecoveryEvidence[];
  blockers: string[];
};

export type CompleteRecoveryManifestSummary = {
  supported_package_complete: boolean;
  recovery_inventory_complete: boolean;
  actual_package_contents_verified: boolean;
  full_project_recovery_complete: boolean;
  blockers: string[];
  warnings: string[];
};

export type CompleteRecoveryManifest = {
  schema_version: typeof completeRecoveryManifestVersion;
  generated_by: typeof completeRecoveryManifestGenerator;
  generated_at: string;
  restore_point_id?: string;
  backup_id: string;
  backup_created_at: string;
  backup_completed_at?: string;
  declared_consistency_model: "sequential_full_export_not_transactional" | "provider_pitr" | "verified_snapshot";
  consistency_statement: string;
  backup_version: string;
  component_inventory: CompleteRecoveryComponent[];
  summary: CompleteRecoveryManifestSummary;
};

export type CompleteRecoveryTableEvidence = {
  table: string;
  record_count: number;
  bytes: number;
  sha256: string;
};

export type CompleteRecoveryBucketEvidence = {
  bucket: string;
  object_count: number;
  total_bytes: number;
};

export type CompleteRecoveryFileEvidence = {
  path: string;
  size: number;
  sha256: string;
  source_type: string;
  source_name: string;
};

export type BuildCompleteRecoveryManifestInput = {
  backupId: string;
  backupVersion: string;
  createdAt: string;
  completedAt?: string;
  requiredTables: string[];
  requiredBuckets: string[];
  tables: CompleteRecoveryTableEvidence[];
  buckets: CompleteRecoveryBucketEvidence[];
  fileList: CompleteRecoveryFileEvidence[];
  sha256Checksums: Record<string, string>;
};

export type CompleteRecoveryManifestValidationResult = {
  valid: boolean;
  legacy: boolean;
  errors: string[];
  warnings: string[];
};

type ComponentDefinition = {
  key: string;
  group: CompleteRecoveryComponentGroup;
  label: string;
  status: CompleteRecoveryComponentStatus;
  recoveryMethodSupported: boolean;
  evidence: CompleteRecoveryEvidence[];
  blockers: string[];
};

function evidence(kind: string, status: CompleteRecoveryEvidence["status"], reference: string, details: string): CompleteRecoveryEvidence {
  return { kind, status, reference, details };
}

function component(definition: ComponentDefinition): CompleteRecoveryComponent {
  return {
    key: definition.key,
    group: definition.group,
    label: definition.label,
    required_for_full_project_recovery: true,
    status: definition.status,
    recovery_method_supported: definition.recoveryMethodSupported,
    evidence: definition.evidence,
    blockers: definition.blockers,
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function tableEvidence(input: BuildCompleteRecoveryManifestInput, tableName: string) {
  return input.tables.find((table) => table.table === tableName);
}

function bucketEvidence(input: BuildCompleteRecoveryManifestInput, bucketName: string) {
  return input.buckets.find((bucket) => bucket.bucket === bucketName);
}

function hasRequiredTables(input: BuildCompleteRecoveryManifestInput) {
  return input.requiredTables.every((table) => Boolean(tableEvidence(input, table)));
}

function hasRequiredBuckets(input: BuildCompleteRecoveryManifestInput) {
  return input.requiredBuckets.every((bucket) => Boolean(bucketEvidence(input, bucket)));
}

function buildComponents(input: BuildCompleteRecoveryManifestInput): CompleteRecoveryComponent[] {
  const missingTables = input.requiredTables.filter((table) => !tableEvidence(input, table));
  const missingBuckets = input.requiredBuckets.filter((bucket) => !bucketEvidence(input, bucket));
  const checksumCount = Object.keys(input.sha256Checksums || {}).length;

  return [
    component({
      key: "database_table_definitions",
      group: "database",
      label: "Database table definitions and column types",
      status: "requires_provider",
      recoveryMethodSupported: false,
      evidence: [evidence("schema_export", "not_verified", "provider_schema_export", "No database schema export is included in the current backup package.")],
      blockers: ["Database schema export and schema restore workflow are not implemented."],
    }),
    component({
      key: "database_table_data",
      group: "database",
      label: "Database table data and record counts",
      status: missingTables.length === 0 ? "captured" : "not_verified",
      recoveryMethodSupported: true,
      evidence: input.tables.map((table) => evidence("table_jsonl_export", "captured", `data/${table.table}.jsonl`, `${table.record_count} row(s), ${table.bytes} byte(s), SHA-256 recorded.`)),
      blockers: missingTables.length === 0 ? [] : [`Missing required table export(s): ${missingTables.join(", ")}.`],
    }),
    component({
      key: "database_primary_keys",
      group: "database",
      label: "Primary keys",
      status: "not_verified",
      recoveryMethodSupported: false,
      evidence: [evidence("table_data_primary_key_assumption", "not_verified", "restore_primary_key_mapping", "Restore code has table primary-key assumptions, but the backup package does not contain verified database primary-key definitions.")],
      blockers: ["Primary-key definitions are not captured from the database schema."],
    }),
    component({
      key: "database_foreign_keys_relationships",
      group: "database",
      label: "Foreign keys, relationships, and dependency ordering",
      status: "not_verified",
      recoveryMethodSupported: false,
      evidence: [evidence("archive_reference_checks", "not_verified", "restore_preflight", "Preflight can inspect known archive references, but actual foreign-key definitions and destination compatibility are not captured.")],
      blockers: ["Foreign-key definitions and complete relationship metadata are not captured."],
    }),
    component({
      key: "database_indexes_constraints",
      group: "database",
      label: "Indexes and constraints",
      status: "requires_provider",
      recoveryMethodSupported: false,
      evidence: [evidence("schema_export", "not_verified", "provider_schema_export", "No index or constraint definitions are included.")],
      blockers: ["Indexes and constraints require a schema export or migration-state recovery mechanism."],
    }),
    component({
      key: "database_functions_triggers",
      group: "database",
      label: "Functions and triggers",
      status: "requires_provider",
      recoveryMethodSupported: false,
      evidence: [evidence("schema_export", "not_verified", "provider_schema_export", "No database functions or triggers are included.")],
      blockers: ["Functions and triggers require a schema export or migration-state recovery mechanism."],
    }),
    component({
      key: "database_rls_policies",
      group: "database",
      label: "RLS enabled state and policies",
      status: "requires_provider",
      recoveryMethodSupported: false,
      evidence: [evidence("policy_export", "not_verified", "provider_policy_export", "No RLS enabled-state or policy definitions are included.")],
      blockers: ["RLS policy capture and restore are not implemented."],
    }),
    component({
      key: "database_extensions_migrations",
      group: "database",
      label: "Extensions and migration history",
      status: "requires_provider",
      recoveryMethodSupported: false,
      evidence: [evidence("migration_state", "not_verified", "supabase_migrations", "Backup package records the application backup format version, not database migration history.")],
      blockers: ["Database extension and migration-state recovery are not implemented."],
    }),
    component({
      key: "database_sequences_counters",
      group: "database",
      label: "Sequences and relevant counter state",
      status: "not_verified",
      recoveryMethodSupported: false,
      evidence: [evidence("sequence_state", "not_verified", "provider_schema_export", "No sequence or counter state is captured.")],
      blockers: ["Sequence/counter state capture is not implemented."],
    }),
    component({
      key: "auth_users",
      group: "authentication",
      label: "Supabase Auth users",
      status: "requires_provider",
      recoveryMethodSupported: false,
      evidence: [evidence("auth_export", "unsupported", "supabase_auth", "Supabase Auth users are intentionally not exported by the current backup package.")],
      blockers: ["Supabase Auth export/restore or authorized reconciliation is required."],
    }),
    component({
      key: "auth_identities_providers",
      group: "authentication",
      label: "Auth identities and supported provider information",
      status: "requires_provider",
      recoveryMethodSupported: false,
      evidence: [evidence("identity_export", "unsupported", "supabase_auth_identities", "Auth provider identities are not included.")],
      blockers: ["Auth identities require provider-supported export/restore."],
    }),
    component({
      key: "auth_mfa_details",
      group: "authentication",
      label: "MFA and advanced authentication details",
      status: "requires_provider",
      recoveryMethodSupported: false,
      evidence: [evidence("mfa_export", "unsupported", "supabase_auth_mfa", "MFA state is not included.")],
      blockers: ["MFA recovery requires provider-supported Auth backup capabilities."],
    }),
    component({
      key: "auth_profile_linkage",
      group: "authentication",
      label: "Profile-to-user linkage",
      status: tableEvidence(input, "profiles") ? "captured" : "not_verified",
      recoveryMethodSupported: false,
      evidence: tableEvidence(input, "profiles") ? [evidence("profiles_table", "captured", "data/profiles.jsonl", "Public profile rows are captured, but matching Auth users are not included.")] : [],
      blockers: ["Profile rows cannot establish complete account recovery without Auth users and identities."],
    }),
    component({
      key: "authorization_business_roles_permissions",
      group: "authentication",
      label: "Business roles, staff permissions, and account relationships",
      status: tableEvidence(input, "business_users") ? "captured" : "not_verified",
      recoveryMethodSupported: false,
      evidence: tableEvidence(input, "business_users") ? [evidence("business_users_table", "captured", "data/business_users.jsonl", "Business role rows are captured when present in the table export.")] : [],
      blockers: ["Authorization rows remain dependent on Auth user recovery and schema/RLS restoration."],
    }),
    component({
      key: "storage_bucket_definitions",
      group: "storage",
      label: "Storage bucket definitions",
      status: "requires_provider",
      recoveryMethodSupported: false,
      evidence: input.buckets.map((bucket) => evidence("bucket_inventory", "captured", bucket.bucket, `${bucket.object_count} object(s) listed for this bucket.`)),
      blockers: ["Bucket definitions and configuration are inventoried by name only, not restorable from this package."],
    }),
    component({
      key: "storage_bucket_policies",
      group: "storage",
      label: "Storage bucket access policies",
      status: "requires_provider",
      recoveryMethodSupported: false,
      evidence: [evidence("storage_policy_export", "not_verified", "provider_storage_policy_export", "Storage access policies are not captured.")],
      blockers: ["Storage policy capture/restore is not implemented."],
    }),
    component({
      key: "storage_object_inventory",
      group: "storage",
      label: "Storage object inventory",
      status: missingBuckets.length === 0 ? "captured" : "not_verified",
      recoveryMethodSupported: true,
      evidence: input.buckets.map((bucket) => evidence("storage_inventory", "captured", bucket.bucket, `${bucket.object_count} object(s), ${bucket.total_bytes} byte(s).`)),
      blockers: missingBuckets.length === 0 ? [] : [`Missing required bucket inventory: ${missingBuckets.join(", ")}.`],
    }),
    component({
      key: "storage_object_content_checksums",
      group: "storage",
      label: "Storage object content and checksums",
      status: missingBuckets.length === 0 ? "captured" : "not_verified",
      recoveryMethodSupported: true,
      evidence: input.buckets.map((bucket) => evidence("storage_object_checksums", "captured", bucket.bucket, `${bucket.object_count} object checksum record(s) are captured in the manifest object list.`)),
      blockers: missingBuckets.length === 0 ? [] : ["Required Storage bucket exports are incomplete."],
    }),
    component({
      key: "storage_object_metadata",
      group: "storage",
      label: "Storage object metadata",
      status: missingBuckets.length === 0 ? "captured" : "not_verified",
      recoveryMethodSupported: false,
      evidence: [evidence("object_metadata", "captured", "manifest.buckets.objects", "Object path, byte size, SHA-256, content type, and optional updated_at are captured when available.")],
      blockers: ["Full provider metadata and bucket configuration are not captured."],
    }),
    component({
      key: "storage_database_references",
      group: "storage",
      label: "Database-to-storage references",
      status: "not_verified",
      recoveryMethodSupported: false,
      evidence: [evidence("reference_validation", "not_verified", "future_restore_preflight", "Database-to-storage references are not currently verified as a complete graph.")],
      blockers: ["Database-to-storage reference validation is not implemented."],
    }),
    component({
      key: "storage_deletion_consistency",
      group: "storage",
      label: "Storage deletion and consistency evidence",
      status: "not_verified",
      recoveryMethodSupported: false,
      evidence: [evidence("deletion_tombstones", "not_verified", "storage_snapshot", "No deletion tombstones or provider storage snapshot marker is included.")],
      blockers: ["Storage changes during backup are not represented by a consistent provider snapshot."],
    }),
    component({
      key: "application_source_git_revision",
      group: "application",
      label: "Application source and Git revision reference",
      status: "requires_external_runbook",
      recoveryMethodSupported: false,
      evidence: [evidence("git_reference", "not_verified", "external_version_control", "Application source is not included in the backup package.")],
      blockers: ["Application source recovery requires version control/deployment runbook evidence."],
    }),
    component({
      key: "application_dependencies_lockfile",
      group: "application",
      label: "Dependencies and lockfile reference",
      status: "requires_external_runbook",
      recoveryMethodSupported: false,
      evidence: [evidence("lockfile_reference", "not_verified", "external_version_control", "Dependency lockfiles are not included.")],
      blockers: ["Dependency/build inputs require version-control recovery evidence."],
    }),
    component({
      key: "application_build_runtime_deployment",
      group: "application",
      label: "Build/runtime and deployment configuration references",
      status: "requires_external_runbook",
      recoveryMethodSupported: false,
      evidence: [evidence("deployment_config", "not_verified", "deployment_provider", "Deployment configuration is not included.")],
      blockers: ["Deployment configuration requires provider or runbook recovery evidence."],
    }),
    component({
      key: "operations_environment_variable_names",
      group: "operations",
      label: "Required environment-variable names",
      status: "requires_external_runbook",
      recoveryMethodSupported: false,
      evidence: [evidence("environment_inventory", "not_verified", "secret_manager_runbook", "Environment variable names and secret references are not included in this package to avoid exposing sensitive configuration.")],
      blockers: ["Environment recovery requires a separate non-secret inventory and secret-manager runbook."],
    }),
    component({
      key: "operations_secret_manager_references",
      group: "operations",
      label: "Secret-manager reference IDs and recovery runbook references",
      status: "requires_external_runbook",
      recoveryMethodSupported: false,
      evidence: [evidence("secret_reference", "not_verified", "secret_manager", "No secret values or secret reference IDs are exported.")],
      blockers: ["Secret recovery must use an external secret manager/runbook and must not be embedded in browser-visible backup reports."],
    }),
    component({
      key: "operations_external_integrations",
      group: "operations",
      label: "External integrations, payment and email providers",
      status: "requires_external_runbook",
      recoveryMethodSupported: false,
      evidence: [evidence("integration_inventory", "not_verified", "provider_runbooks", "Payment, email, and other provider configuration is not included.")],
      blockers: ["External integrations require provider-specific recovery runbooks."],
    }),
    component({
      key: "operations_webhooks_scheduled_jobs",
      group: "operations",
      label: "Webhooks and scheduled jobs",
      status: "requires_external_runbook",
      recoveryMethodSupported: false,
      evidence: [evidence("operations_inventory", "not_verified", "provider_runbooks", "Webhook and scheduled-job provider configuration is not included.")],
      blockers: ["Webhooks and scheduled jobs require provider-specific recovery evidence."],
    }),
    component({
      key: "operations_recovery_documentation",
      group: "operations",
      label: "Operational recovery documentation",
      status: "requires_external_runbook",
      recoveryMethodSupported: false,
      evidence: [evidence("recovery_runbook", "not_verified", "external_documentation", "Operational recovery runbook evidence is not packaged.")],
      blockers: ["Complete recovery requires external runbook references and operator procedures."],
    }),
    component({
      key: "package_archive_identity_version",
      group: "package_integrity",
      label: "Archive identity and version",
      status: "captured",
      recoveryMethodSupported: true,
      evidence: [
        evidence("backup_id", "captured", input.backupId, "Backup ID is recorded in the manifest."),
        evidence("backup_version", "captured", input.backupVersion, "Backup package format version is recorded."),
      ],
      blockers: [],
    }),
    component({
      key: "package_size_checksum",
      group: "package_integrity",
      label: "Package size and checksum",
      status: "not_verified",
      recoveryMethodSupported: true,
      evidence: [evidence("package_hash", "not_verified", "backup_jobs.package_sha256", "Package size and SHA-256 are available only after archive creation/storage and must be verified against actual stored bytes.")],
      blockers: ["Archive-level package checksum cannot be verified from inside the manifest at creation time."],
    }),
    component({
      key: "package_per_file_integrity",
      group: "package_integrity",
      label: "Per-file integrity evidence",
      status: checksumCount > 0 ? "captured" : "not_verified",
      recoveryMethodSupported: true,
      evidence: [evidence("file_checksums", checksumCount > 0 ? "captured" : "not_verified", "manifest.sha256_checksums", `${checksumCount} per-file checksum entr${checksumCount === 1 ? "y is" : "ies are"} recorded.`)],
      blockers: checksumCount > 0 ? [] : ["Per-file checksum inventory is missing."],
    }),
    component({
      key: "package_manifest_validation_tooling",
      group: "package_integrity",
      label: "Manifest and validation-tool versions",
      status: "captured",
      recoveryMethodSupported: true,
      evidence: [
        evidence("complete_recovery_manifest_version", "captured", completeRecoveryManifestVersion, "Complete recovery manifest schema version is recorded."),
        evidence("validation_tool", "captured", completeRecoveryManifestGenerator, "Manifest generator identity is recorded."),
      ],
      blockers: [],
    }),
    component({
      key: "package_required_exports_findings",
      group: "package_integrity",
      label: "Required exports and missing-component findings",
      status: hasRequiredTables(input) && hasRequiredBuckets(input) ? "captured" : "not_verified",
      recoveryMethodSupported: true,
      evidence: [
        evidence("required_tables", hasRequiredTables(input) ? "captured" : "not_verified", "manifest.tables", `${input.requiredTables.length - missingTables.length}/${input.requiredTables.length} required table export(s) are listed.`),
        evidence("required_buckets", hasRequiredBuckets(input) ? "captured" : "not_verified", "manifest.buckets", `${input.requiredBuckets.length - missingBuckets.length}/${input.requiredBuckets.length} required bucket export(s) are listed.`),
      ],
      blockers: [...missingTables.map((table) => `Missing required table export: ${table}.`), ...missingBuckets.map((bucket) => `Missing required bucket export: ${bucket}.`)],
    }),
  ];
}

export function summarizeCompleteRecoveryComponents(components: CompleteRecoveryComponent[]) {
  const componentKeys = unique(components.map((item) => item.key));
  const componentBlockers = components.flatMap((item) => item.blockers.map((blocker) => `${item.label}: ${blocker}`));
  const unsupportedBlockers = components
    .filter((item) => item.required_for_full_project_recovery && (!item.recovery_method_supported || item.status === "unsupported" || item.status === "requires_provider" || item.status === "requires_external_runbook" || item.status === "not_verified"))
    .map((item) => `${item.label} is ${item.status.replace(/_/g, " ")} and recovery method supported is ${item.recovery_method_supported ? "yes" : "no"}.`);
  const fullProjectReady = components.every((item) => !item.required_for_full_project_recovery || (item.status === "verified" && item.recovery_method_supported && item.blockers.length === 0));
  const supportedPackageComplete = ["database_table_data", "storage_object_inventory", "storage_object_content_checksums", "package_per_file_integrity", "package_required_exports_findings"].every((key) => {
    const item = components.find((componentItem) => componentItem.key === key);
    return Boolean(item && (item.status === "captured" || item.status === "verified") && item.blockers.length === 0);
  });

  return {
    supported_package_complete: supportedPackageComplete,
    recovery_inventory_complete: componentKeys.length === requiredCompleteRecoveryComponentKeys.length && requiredCompleteRecoveryComponentKeys.every((key) => componentKeys.includes(key)),
    actual_package_contents_verified: components.some((item) => item.status === "verified") && components.filter((item) => item.group === "package_integrity").every((item) => item.status === "verified"),
    full_project_recovery_complete: fullProjectReady,
    blockers: unique([...componentBlockers, ...unsupportedBlockers]),
    warnings: [
      "This manifest inventories complete recovery requirements but does not by itself prove full-project recoverability.",
      "Backup creation time is not a transactional database snapshot or provider point-in-time recovery marker.",
      "A captured component is not equivalent to a verified component.",
    ],
  } satisfies CompleteRecoveryManifestSummary;
}

export const requiredCompleteRecoveryComponentKeys = [
  "database_table_definitions",
  "database_table_data",
  "database_primary_keys",
  "database_foreign_keys_relationships",
  "database_indexes_constraints",
  "database_functions_triggers",
  "database_rls_policies",
  "database_extensions_migrations",
  "database_sequences_counters",
  "auth_users",
  "auth_identities_providers",
  "auth_mfa_details",
  "auth_profile_linkage",
  "authorization_business_roles_permissions",
  "storage_bucket_definitions",
  "storage_bucket_policies",
  "storage_object_inventory",
  "storage_object_content_checksums",
  "storage_object_metadata",
  "storage_database_references",
  "storage_deletion_consistency",
  "application_source_git_revision",
  "application_dependencies_lockfile",
  "application_build_runtime_deployment",
  "operations_environment_variable_names",
  "operations_secret_manager_references",
  "operations_external_integrations",
  "operations_webhooks_scheduled_jobs",
  "operations_recovery_documentation",
  "package_archive_identity_version",
  "package_size_checksum",
  "package_per_file_integrity",
  "package_manifest_validation_tooling",
  "package_required_exports_findings",
] as const;

export function buildCompleteRecoveryManifest(input: BuildCompleteRecoveryManifestInput): CompleteRecoveryManifest {
  const components = buildComponents(input);
  const summary = summarizeCompleteRecoveryComponents(components);

  return {
    schema_version: completeRecoveryManifestVersion,
    generated_by: completeRecoveryManifestGenerator,
    generated_at: new Date().toISOString(),
    restore_point_id: input.backupId,
    backup_id: input.backupId,
    backup_created_at: input.createdAt,
    backup_completed_at: input.completedAt,
    declared_consistency_model: "sequential_full_export_not_transactional",
    consistency_statement: "This backup is a sequential full export. The creation timestamp is not proof of a transactionally consistent database, storage, Auth, application, and operations restore point.",
    backup_version: input.backupVersion,
    component_inventory: components,
    summary,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isKnownStatus(value: unknown): value is CompleteRecoveryComponentStatus {
  return value === "captured"
    || value === "verified"
    || value === "unsupported"
    || value === "requires_provider"
    || value === "requires_external_runbook"
    || value === "not_verified";
}

export function validateCompleteRecoveryManifest(manifest: unknown, backupId: string): CompleteRecoveryManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest) {
    return {
      valid: true,
      legacy: true,
      errors,
      warnings: ["Complete recovery manifest is absent. Treating package as legacy supported-package backup, not a complete project recovery point."],
    };
  }

  if (!isObject(manifest)) {
    return { valid: false, legacy: false, errors: ["complete_recovery_manifest must be an object."], warnings };
  }

  if (manifest.schema_version !== completeRecoveryManifestVersion) {
    errors.push(`complete_recovery_manifest schema version is unsupported. Expected ${completeRecoveryManifestVersion}.`);
  }

  if (manifest.backup_id !== backupId) {
    errors.push("complete_recovery_manifest backup_id does not match manifest backup_id.");
  }

  if (manifest.declared_consistency_model === "verified_snapshot" || manifest.declared_consistency_model === "provider_pitr") {
    warnings.push("complete_recovery_manifest declares a stronger consistency model than the current backup generator can prove. Verify provider evidence before relying on this package.");
  }

  const components = Array.isArray(manifest.component_inventory) ? manifest.component_inventory : null;
  if (!components) {
    errors.push("complete_recovery_manifest component_inventory must be an array.");
  }

  const componentKeys = new Set<string>();
  const unsupportedOrUnverifiedRequired: string[] = [];

  for (const item of components || []) {
    if (!isObject(item)) {
      errors.push("complete_recovery_manifest contains a non-object component entry.");
      continue;
    }

    const key = typeof item.key === "string" ? item.key : "";
    if (!key) errors.push("complete_recovery_manifest component is missing key.");
    if (key) componentKeys.add(key);

    if (!isKnownStatus(item.status)) {
      errors.push(`complete_recovery_manifest component ${key || "unknown"} has invalid status.`);
    }

    const evidenceEntries = Array.isArray(item.evidence) ? item.evidence : [];
    if ((item.status === "captured" || item.status === "verified") && evidenceEntries.length === 0) {
      errors.push(`complete_recovery_manifest component ${key || "unknown"} claims ${item.status} without evidence.`);
    }

    const recoverySupported = item.recovery_method_supported === true;
    const required = item.required_for_full_project_recovery !== false;
    if (item.status === "verified") {
      const hasVerifiedEvidence = evidenceEntries.some((entry) => isObject(entry) && entry.status === "verified");
      if (!hasVerifiedEvidence) errors.push(`complete_recovery_manifest component ${key || "unknown"} claims verified without verified evidence.`);
      if (!recoverySupported) errors.push(`complete_recovery_manifest component ${key || "unknown"} claims verified but has no supported recovery method.`);
    }

    if (required && (!recoverySupported || item.status !== "verified")) {
      unsupportedOrUnverifiedRequired.push(key || "unknown");
    }
  }

  const missingComponentKeys = requiredCompleteRecoveryComponentKeys.filter((key) => !componentKeys.has(key));
  if (missingComponentKeys.length > 0) {
    errors.push(`complete_recovery_manifest is missing required component entries: ${missingComponentKeys.join(", ")}.`);
  }

  const summary = isObject(manifest.summary) ? manifest.summary : null;
  if (!summary) {
    errors.push("complete_recovery_manifest summary must be an object.");
  } else {
    if (summary.recovery_inventory_complete === true && missingComponentKeys.length > 0) {
      errors.push("complete_recovery_manifest summary claims complete inventory while required components are missing.");
    }

    if (summary.full_project_recovery_complete === true && unsupportedOrUnverifiedRequired.length > 0) {
      errors.push("complete_recovery_manifest summary falsely claims full project recovery while required components are unsupported or unverified.");
    }

    if (summary.actual_package_contents_verified === true) {
      warnings.push("complete_recovery_manifest claims actual package contents are verified. This claim must come from stored-package validation, not backup generation metadata alone.");
    }
  }

  return {
    valid: errors.length === 0,
    legacy: false,
    errors,
    warnings,
  };
}