import crypto from "crypto";
import fs from "fs";
import path from "path";

export const databaseSchemaRecoveryManifestVersion = "2026-10-26.database-schema-recovery-v1";
export const databaseSchemaRecoveryGenerator = "royalty-stamp-dr-database-schema-recovery-v1";

export type DatabaseSchemaRecoveryCategoryKey =
  | "schemas_tables"
  | "columns_types_nullability_defaults"
  | "primary_keys_unique_constraints"
  | "foreign_keys_referential_actions"
  | "check_exclusion_constraints"
  | "indexes"
  | "sequences_identity_generation"
  | "views_materialized_views"
  | "functions_procedures"
  | "triggers_dependencies"
  | "rls_state_policies"
  | "privileges_grants"
  | "extensions_features"
  | "enums_domains_custom_types"
  | "migration_history_expected_version"
  | "other_database_dependencies";

export type DatabaseSchemaEvidenceStatus =
  | "present_repository"
  | "captured_from_backup"
  | "not_captured"
  | "not_verified"
  | "requires_provider"
  | "blocked";

export type DatabaseSchemaRecoveryProcedureStatus =
  | "not_implemented"
  | "implemented_unverified"
  | "tested"
  | "blocked"
  | "requires_provider";

export type DatabaseSchemaRecoveryEvidence = {
  kind: "repository_migrations" | "generated_types" | "backup_table_data" | "live_database" | "application_config" | "missing";
  status: DatabaseSchemaEvidenceStatus;
  reference: string;
  details: string;
  sha256?: string;
  count?: number;
};

export type DatabaseSchemaRecoveryCategory = {
  key: DatabaseSchemaRecoveryCategoryKey;
  label: string;
  present_in_repository: boolean;
  captured_by_backup_system: boolean;
  validated_without_database_mutation: boolean;
  recovery_procedure_exists: boolean;
  recovery_procedure_status: DatabaseSchemaRecoveryProcedureStatus;
  required_privileges_or_capabilities: string[];
  dependencies: string[];
  evidence: DatabaseSchemaRecoveryEvidence[];
  blockers: string[];
  limitations: string[];
};

export type DatabaseSchemaRecoverySummary = {
  repository_inventory_available: boolean;
  live_database_schema_captured: boolean;
  schema_fingerprint_available: boolean;
  migration_history_available: boolean;
  complete_schema_recovery_supported: boolean;
  implemented_recovery_procedure_available: boolean;
  validation_status: "repository_derived_unverified" | "blocked" | "malformed";
  blockers: string[];
  warnings: string[];
};

export type DatabaseSchemaRecoveryInventory = {
  schema_recovery_manifest_version: typeof databaseSchemaRecoveryManifestVersion;
  generated_by: typeof databaseSchemaRecoveryGenerator;
  generated_at: string;
  backup_id: string;
  backup_version: string;
  schema_source: "repository_derived";
  live_database_capture: {
    attempted: false;
    status: "not_attempted_safety_boundary";
    details: string;
  };
  repository_evidence: {
    migrations_directory: string;
    migration_file_count: number;
    latest_migration_file?: string;
    generated_types_path: string;
    generated_types_present: boolean;
    schema_fingerprint_sha256?: string;
    fingerprint_algorithm: "sha256(sorted-file-path-size-sha256-pattern-counts-v1)";
    discovered_object_counts: Record<string, number>;
  };
  expected_migration_version?: string;
  categories: DatabaseSchemaRecoveryCategory[];
  future_recovery_sequence: string[];
  summary: DatabaseSchemaRecoverySummary;
};

export type BuildDatabaseSchemaRecoveryInventoryInput = {
  backupId: string;
  backupVersion: string;
  generatedAt?: string;
  projectRoot?: string;
};

export type DatabaseSchemaRecoveryValidationResult = {
  valid: boolean;
  legacy: boolean;
  errors: string[];
  warnings: string[];
};

export const requiredDatabaseSchemaRecoveryCategoryKeys: DatabaseSchemaRecoveryCategoryKey[] = [
  "schemas_tables",
  "columns_types_nullability_defaults",
  "primary_keys_unique_constraints",
  "foreign_keys_referential_actions",
  "check_exclusion_constraints",
  "indexes",
  "sequences_identity_generation",
  "views_materialized_views",
  "functions_procedures",
  "triggers_dependencies",
  "rls_state_policies",
  "privileges_grants",
  "extensions_features",
  "enums_domains_custom_types",
  "migration_history_expected_version",
  "other_database_dependencies",
];

type RepositorySchemaEvidence = {
  migrationsDirectory: string;
  migrationFiles: Array<{ relativePath: string; size: number; sha256: string; content: string }>;
  generatedTypesPath: string;
  generatedTypesSha256?: string;
  discoveredObjectCounts: Record<string, number>;
  schemaFingerprintSha256?: string;
  latestMigrationFile?: string;
};

const patternMap: Array<{ key: string; pattern: RegExp }> = [
  { key: "create_table", pattern: /\bcreate\s+table\b/gi },
  { key: "alter_table", pattern: /\balter\s+table\b/gi },
  { key: "primary_key", pattern: /\bprimary\s+key\b/gi },
  { key: "foreign_key", pattern: /\bforeign\s+key\b|\breferences\b/gi },
  { key: "unique_constraint", pattern: /\bunique\b/gi },
  { key: "check_constraint", pattern: /\bcheck\s*\(/gi },
  { key: "create_index", pattern: /\bcreate\s+(unique\s+)?index\b/gi },
  { key: "create_sequence", pattern: /\bcreate\s+sequence\b|\bgenerated\s+(always|by\s+default)\s+as\s+identity\b/gi },
  { key: "create_view", pattern: /\bcreate\s+(materialized\s+)?view\b/gi },
  { key: "create_function", pattern: /\bcreate\s+(or\s+replace\s+)?function\b|\bcreate\s+(or\s+replace\s+)?procedure\b/gi },
  { key: "create_trigger", pattern: /\bcreate\s+trigger\b/gi },
  { key: "rls_policy", pattern: /\benable\s+row\s+level\s+security\b|\bforce\s+row\s+level\s+security\b|\bcreate\s+policy\b/gi },
  { key: "grant_privilege", pattern: /\bgrant\b|\brevoke\b/gi },
  { key: "extension", pattern: /\bcreate\s+extension\b/gi },
  { key: "custom_type", pattern: /\bcreate\s+type\b|\bcreate\s+domain\b/gi },
];

function countMatches(content: string, pattern: RegExp) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function sha256(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeReadDirectory(directoryPath: string) {
  try {
    return fs.readdirSync(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function collectSqlFiles(directoryPath: string, basePath = directoryPath): string[] {
  const entries = safeReadDirectory(directoryPath);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSqlFiles(fullPath, basePath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".sql")) {
      files.push(path.relative(basePath, fullPath).split(path.sep).join("/"));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function analyzeRepositorySchemaEvidence(projectRoot: string): RepositorySchemaEvidence {
  const migrationsDirectory = path.join(projectRoot, "supabase", "migrations");
  const generatedTypesPath = path.join(projectRoot, "src", "integrations", "supabase", "database.types.ts");
  const migrationRelativePaths = collectSqlFiles(migrationsDirectory);
  const migrationFiles = migrationRelativePaths.map((relativePath) => {
    const fullPath = path.join(migrationsDirectory, relativePath);
    const content = fs.readFileSync(fullPath, "utf8");
    return {
      relativePath,
      size: Buffer.byteLength(content),
      sha256: sha256(content),
      content,
    };
  });

  const discoveredObjectCounts: Record<string, number> = Object.fromEntries(patternMap.map((item) => [item.key, 0]));
  for (const file of migrationFiles) {
    for (const item of patternMap) {
      discoveredObjectCounts[item.key] += countMatches(file.content, item.pattern);
    }
  }

  let generatedTypesSha256: string | undefined;
  if (fs.existsSync(generatedTypesPath)) {
    generatedTypesSha256 = sha256(fs.readFileSync(generatedTypesPath));
  }

  const fingerprintInput = [
    `generator=${databaseSchemaRecoveryGenerator}`,
    ...migrationFiles.map((file) => `${file.relativePath}:${file.size}:${file.sha256}`),
    generatedTypesSha256 ? `generated-types:${generatedTypesSha256}` : "generated-types:missing",
    ...Object.entries(discoveredObjectCounts).sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => `${key}:${count}`),
  ].join("\n");

  return {
    migrationsDirectory: "supabase/migrations",
    migrationFiles,
    generatedTypesPath: "src/integrations/supabase/database.types.ts",
    generatedTypesSha256,
    discoveredObjectCounts,
    schemaFingerprintSha256: migrationFiles.length > 0 || generatedTypesSha256 ? sha256(fingerprintInput) : undefined,
    latestMigrationFile: migrationFiles.at(-1)?.relativePath,
  };
}

function evidence(kind: DatabaseSchemaRecoveryEvidence["kind"], status: DatabaseSchemaEvidenceStatus, reference: string, details: string, extras: Partial<DatabaseSchemaRecoveryEvidence> = {}): DatabaseSchemaRecoveryEvidence {
  return { kind, status, reference, details, ...extras };
}

function category(input: {
  key: DatabaseSchemaRecoveryCategoryKey;
  label: string;
  presentInRepository: boolean;
  capturedByBackupSystem?: boolean;
  validatedWithoutDatabaseMutation?: boolean;
  recoveryProcedureExists?: boolean;
  recoveryProcedureStatus?: DatabaseSchemaRecoveryProcedureStatus;
  capabilities?: string[];
  dependencies?: string[];
  evidence: DatabaseSchemaRecoveryEvidence[];
  blockers: string[];
  limitations: string[];
}): DatabaseSchemaRecoveryCategory {
  return {
    key: input.key,
    label: input.label,
    present_in_repository: input.presentInRepository,
    captured_by_backup_system: input.capturedByBackupSystem || false,
    validated_without_database_mutation: input.validatedWithoutDatabaseMutation || false,
    recovery_procedure_exists: input.recoveryProcedureExists || false,
    recovery_procedure_status: input.recoveryProcedureStatus || "not_implemented",
    required_privileges_or_capabilities: input.capabilities || ["Repository access", "Future independently authorized destination database access"],
    dependencies: input.dependencies || [],
    evidence: input.evidence,
    blockers: input.blockers,
    limitations: input.limitations,
  };
}

function buildCategories(repo: RepositorySchemaEvidence): DatabaseSchemaRecoveryCategory[] {
  const hasMigrations = repo.migrationFiles.length > 0;
  const migrationEvidence = evidence(
    "repository_migrations",
    hasMigrations ? "present_repository" : "not_verified",
    repo.migrationsDirectory,
    hasMigrations ? `${repo.migrationFiles.length} SQL migration file(s) are present in the repository.` : "No repository migration files were found.",
    { count: repo.migrationFiles.length }
  );

  const generatedTypesEvidence = evidence(
    "generated_types",
    repo.generatedTypesSha256 ? "present_repository" : "not_verified",
    repo.generatedTypesPath,
    repo.generatedTypesSha256 ? "Generated Supabase TypeScript database types are present and checksummed." : "Generated Supabase TypeScript database types are missing.",
    repo.generatedTypesSha256 ? { sha256: repo.generatedTypesSha256 } : {}
  );

  return [
    category({
      key: "schemas_tables",
      label: "Schemas and tables",
      presentInRepository: hasMigrations || Boolean(repo.generatedTypesSha256),
      validatedWithoutDatabaseMutation: true,
      evidence: [migrationEvidence, generatedTypesEvidence],
      blockers: ["Live database table definitions are not captured by the backup package.", "No tested schema reconstruction procedure exists."],
      limitations: ["Repository migrations may not prove current live schema state without a non-mutating live schema verification step."],
    }),
    category({
      key: "columns_types_nullability_defaults",
      label: "Columns, data types, nullability, and defaults",
      presentInRepository: hasMigrations || Boolean(repo.generatedTypesSha256),
      validatedWithoutDatabaseMutation: true,
      evidence: [migrationEvidence, generatedTypesEvidence],
      blockers: ["Column definitions are repository-derived only and not captured from the live database."],
      limitations: ["Generated TypeScript types do not preserve every database default, constraint, policy, or trigger detail."],
    }),
    category({
      key: "primary_keys_unique_constraints",
      label: "Primary keys and unique constraints",
      presentInRepository: repo.discoveredObjectCounts.primary_key > 0 || repo.discoveredObjectCounts.unique_constraint > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.primary_key > 0 || repo.discoveredObjectCounts.unique_constraint > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.primary_key} primary-key pattern(s) and ${repo.discoveredObjectCounts.unique_constraint} unique pattern(s) found in repository migrations.`)],
      blockers: ["Primary/unique constraints are not captured as live database schema evidence."],
      limitations: ["Pattern counts are inventory evidence, not a parsed dependency-aware schema model."],
    }),
    category({
      key: "foreign_keys_referential_actions",
      label: "Foreign keys and referential actions",
      presentInRepository: repo.discoveredObjectCounts.foreign_key > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.foreign_key > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.foreign_key} foreign-key/reference pattern(s) found in repository migrations.`)],
      blockers: ["Foreign-key definitions and referential actions are not captured from the live database."],
      limitations: ["Repository evidence must be parsed and compared to live schema before restore planning."],
    }),
    category({
      key: "check_exclusion_constraints",
      label: "Check constraints and exclusion constraints",
      presentInRepository: repo.discoveredObjectCounts.check_constraint > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.check_constraint > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.check_constraint} check-constraint pattern(s) found in repository migrations.`)],
      blockers: ["Constraint definitions are not captured as verified live schema evidence."],
      limitations: ["Exclusion constraints are not separately parsed by the current repository inventory."],
    }),
    category({
      key: "indexes",
      label: "Indexes",
      presentInRepository: repo.discoveredObjectCounts.create_index > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.create_index > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.create_index} CREATE INDEX pattern(s) found in repository migrations.`)],
      blockers: ["Index definitions are not captured from live database catalogs."],
      limitations: ["Index validity, expression indexes, partial predicates, and operator classes require parsed SQL or live catalog verification."],
    }),
    category({
      key: "sequences_identity_generation",
      label: "Sequences and identity-generation configuration",
      presentInRepository: repo.discoveredObjectCounts.create_sequence > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.create_sequence > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.create_sequence} sequence/identity pattern(s) found in repository migrations.`)],
      blockers: ["Live sequence values and identity state are not captured."],
      limitations: ["Sequence current values require a safe live export or provider-supported dump."],
    }),
    category({
      key: "views_materialized_views",
      label: "Views and materialized views",
      presentInRepository: repo.discoveredObjectCounts.create_view > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.create_view > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.create_view} view pattern(s) found in repository migrations.`)],
      blockers: ["View definitions are not captured as verified live schema evidence."],
      limitations: ["View dependency ordering is not implemented."],
    }),
    category({
      key: "functions_procedures",
      label: "Database functions and procedures",
      presentInRepository: repo.discoveredObjectCounts.create_function > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.create_function > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.create_function} function/procedure pattern(s) found in repository migrations.`)],
      blockers: ["Function/procedure definitions are not captured from the live database and recovery execution is not implemented."],
      limitations: ["Function security definer properties, grants, dependencies, and extension requirements need parsed and live verification."],
    }),
    category({
      key: "triggers_dependencies",
      label: "Triggers and trigger dependencies",
      presentInRepository: repo.discoveredObjectCounts.create_trigger > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.create_trigger > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.create_trigger} trigger pattern(s) found in repository migrations.`)],
      blockers: ["Trigger definitions and dependency ordering are not captured from the live database."],
      limitations: ["Trigger-to-function dependency planning is not implemented."],
    }),
    category({
      key: "rls_state_policies",
      label: "Row-Level Security enabled/forced state and policies",
      presentInRepository: repo.discoveredObjectCounts.rls_policy > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.rls_policy > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.rls_policy} RLS/policy pattern(s) found in repository migrations.`)],
      blockers: ["RLS enabled/forced state and policies are not captured as verified live schema evidence."],
      limitations: ["Policy recursion and auth-dependent behavior require defensive review before restore."],
    }),
    category({
      key: "privileges_grants",
      label: "Table, schema, function, and sequence privileges and grants",
      presentInRepository: repo.discoveredObjectCounts.grant_privilege > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.grant_privilege > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.grant_privilege} grant/revoke pattern(s) found in repository migrations.`)],
      blockers: ["Privileges and grants are not captured from live catalogs."],
      limitations: ["Role existence and grant compatibility require destination verification."],
    }),
    category({
      key: "extensions_features",
      label: "Extensions and required database features",
      presentInRepository: repo.discoveredObjectCounts.extension > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.extension > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.extension} extension pattern(s) found in repository migrations.`)],
      blockers: ["Enabled extensions are not verified against the live database or a destination."],
      limitations: ["Extension availability depends on provider support and destination privileges."],
    }),
    category({
      key: "enums_domains_custom_types",
      label: "Enums, domains, and custom types",
      presentInRepository: repo.discoveredObjectCounts.custom_type > 0,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", repo.discoveredObjectCounts.custom_type > 0 ? "present_repository" : "not_verified", repo.migrationsDirectory, `${repo.discoveredObjectCounts.custom_type} custom type/domain pattern(s) found in repository migrations.`)],
      blockers: ["Custom type definitions are not captured as verified live database evidence."],
      limitations: ["Type dependency order is not implemented."],
    }),
    category({
      key: "migration_history_expected_version",
      label: "Migration history and expected schema version",
      presentInRepository: hasMigrations,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", hasMigrations ? "present_repository" : "not_verified", repo.migrationsDirectory, hasMigrations ? `Latest repository migration is ${repo.latestMigrationFile}.` : "No migration history is available.", { count: repo.migrationFiles.length })],
      blockers: hasMigrations ? ["Repository migration history is available, but live applied migration state is not verified."] : ["Migration history is missing."],
      limitations: ["Expected migration version is repository-derived and must not be treated as live database state."],
    }),
    category({
      key: "other_database_dependencies",
      label: "Other database objects or dependencies discovered in the repository",
      presentInRepository: hasMigrations,
      validatedWithoutDatabaseMutation: true,
      evidence: [evidence("repository_migrations", hasMigrations ? "present_repository" : "not_verified", repo.migrationsDirectory, "Repository SQL files may include additional objects that require parser-level classification before recovery.")],
      blockers: ["A dependency-aware schema reconstruction planner is not implemented."],
      limitations: ["This inventory records pattern-level evidence and does not produce executable recovery SQL."],
    }),
  ];
}

function summarize(categories: DatabaseSchemaRecoveryCategory[], repo: RepositorySchemaEvidence): DatabaseSchemaRecoverySummary {
  const blockers = Array.from(new Set(categories.flatMap((item) => item.blockers.map((blocker) => `${item.label}: ${blocker}`))));
  const inventoryComplete = requiredDatabaseSchemaRecoveryCategoryKeys.every((key) => categories.some((item) => item.key === key));
  const completeSchemaReady = false;

  return {
    repository_inventory_available: inventoryComplete && (repo.migrationFiles.length > 0 || Boolean(repo.generatedTypesSha256)),
    live_database_schema_captured: false,
    schema_fingerprint_available: Boolean(repo.schemaFingerprintSha256),
    migration_history_available: repo.migrationFiles.length > 0,
    complete_schema_recovery_supported: completeSchemaReady,
    implemented_recovery_procedure_available: false,
    validation_status: inventoryComplete ? "repository_derived_unverified" : "blocked",
    blockers,
    warnings: [
      "This inventory is repository-derived and is not a live database schema snapshot.",
      "Table-data exports do not constitute schema recovery evidence.",
      "Complete schema recovery remains blocked until schema definitions, live verification, destination compatibility, and a tested recovery procedure exist.",
    ],
  };
}

export function buildDatabaseSchemaRecoveryInventory(input: BuildDatabaseSchemaRecoveryInventoryInput): DatabaseSchemaRecoveryInventory {
  const projectRoot = input.projectRoot || process.cwd();
  const repo = analyzeRepositorySchemaEvidence(projectRoot);
  const categories = buildCategories(repo);

  return {
    schema_recovery_manifest_version: databaseSchemaRecoveryManifestVersion,
    generated_by: databaseSchemaRecoveryGenerator,
    generated_at: input.generatedAt || new Date().toISOString(),
    backup_id: input.backupId,
    backup_version: input.backupVersion,
    schema_source: "repository_derived",
    live_database_capture: {
      attempted: false,
      status: "not_attempted_safety_boundary",
      details: "Live database schema capture was not attempted because this task does not connect to or query protected Supabase projects.",
    },
    repository_evidence: {
      migrations_directory: repo.migrationsDirectory,
      migration_file_count: repo.migrationFiles.length,
      latest_migration_file: repo.latestMigrationFile,
      generated_types_path: repo.generatedTypesPath,
      generated_types_present: Boolean(repo.generatedTypesSha256),
      schema_fingerprint_sha256: repo.schemaFingerprintSha256,
      fingerprint_algorithm: "sha256(sorted-file-path-size-sha256-pattern-counts-v1)",
      discovered_object_counts: repo.discoveredObjectCounts,
    },
    expected_migration_version: repo.latestMigrationFile,
    categories,
    future_recovery_sequence: [
      "Verify the backup package and archive integrity.",
      "Verify schema definitions and repository migration history are available.",
      "Verify the destination is independently authorized and isolated from production.",
      "Check database compatibility, extensions, and required privileges without mutation.",
      "Plan dependency-aware schema reconstruction order.",
      "Validate constraints, functions, triggers, indexes, grants, and RLS policies.",
      "Restore and validate table data only after the schema is ready.",
      "Validate record counts and foreign-key relationships.",
      "Confirm security policies and permissions.",
      "Record a recovery report and unresolved blockers.",
    ],
    summary: summarize(categories, repo),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isKnownCategoryKey(value: unknown): value is DatabaseSchemaRecoveryCategoryKey {
  return typeof value === "string" && requiredDatabaseSchemaRecoveryCategoryKeys.includes(value as DatabaseSchemaRecoveryCategoryKey);
}

export function validateDatabaseSchemaRecoveryInventory(manifest: unknown, backupId: string): DatabaseSchemaRecoveryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!manifest) {
    return {
      valid: true,
      legacy: true,
      errors,
      warnings: ["database_schema_recovery is absent. Treating package as legacy package without schema recovery evidence."],
    };
  }

  if (!isObject(manifest)) {
    return { valid: false, legacy: false, errors: ["database_schema_recovery must be an object."], warnings };
  }

  if (manifest.schema_recovery_manifest_version !== databaseSchemaRecoveryManifestVersion) {
    errors.push(`database_schema_recovery version is unsupported. Expected ${databaseSchemaRecoveryManifestVersion}.`);
  }

  if (manifest.backup_id !== backupId) {
    errors.push("database_schema_recovery backup_id does not match manifest backup_id.");
  }

  if (manifest.schema_source !== "repository_derived") {
    errors.push("database_schema_recovery schema_source is unsupported or falsely implies live database capture.");
  }

  const liveCapture = isObject(manifest.live_database_capture) ? manifest.live_database_capture : null;
  if (!liveCapture) {
    errors.push("database_schema_recovery live_database_capture must be present.");
  } else if (liveCapture.attempted !== false || liveCapture.status !== "not_attempted_safety_boundary") {
    errors.push("database_schema_recovery must not claim live database schema capture in this implementation.");
  }

  const categories = Array.isArray(manifest.categories) ? manifest.categories : null;
  if (!categories) {
    errors.push("database_schema_recovery categories must be an array.");
  }

  const categoryKeys = new Set<string>();
  for (const item of categories || []) {
    if (!isObject(item)) {
      errors.push("database_schema_recovery contains a non-object category.");
      continue;
    }

    if (!isKnownCategoryKey(item.key)) {
      errors.push(`database_schema_recovery contains unknown category key: ${String(item.key || "missing")}.`);
    } else {
      categoryKeys.add(item.key);
    }

    if (item.captured_by_backup_system === true && item.key !== "migration_history_expected_version") {
      warnings.push(`database_schema_recovery category ${String(item.key)} claims backup capture. Verify this does not confuse table-data export with schema capture.`);
    }

    if (item.recovery_procedure_status === "tested" || item.recovery_procedure_exists === true) {
      errors.push(`database_schema_recovery category ${String(item.key)} claims an implemented/tested schema recovery procedure, which is not available in this implementation.`);
    }

    const evidenceEntries = Array.isArray(item.evidence) ? item.evidence : [];
    if (item.present_in_repository === true && evidenceEntries.length === 0) {
      errors.push(`database_schema_recovery category ${String(item.key)} claims repository presence without evidence.`);
    }
  }

  const missing = requiredDatabaseSchemaRecoveryCategoryKeys.filter((key) => !categoryKeys.has(key));
  if (missing.length > 0) {
    errors.push(`database_schema_recovery is missing required categories: ${missing.join(", ")}.`);
  }

  const summary = isObject(manifest.summary) ? manifest.summary : null;
  if (!summary) {
    errors.push("database_schema_recovery summary must be an object.");
  } else {
    if (summary.live_database_schema_captured === true) {
      errors.push("database_schema_recovery summary falsely claims live database schema capture.");
    }
    if (summary.complete_schema_recovery_supported === true) {
      errors.push("database_schema_recovery summary falsely claims complete schema recovery support.");
    }
    if (summary.implemented_recovery_procedure_available === true) {
      errors.push("database_schema_recovery summary falsely claims an implemented schema recovery procedure.");
    }
  }

  return {
    valid: errors.length === 0,
    legacy: false,
    errors,
    warnings,
  };
}