import { backupVersion, requiredBuckets, requiredTables, type BackupManifest } from "@/lib/server/backupConfig";

export type RestorePointComponentStatus = "recoverable" | "partial" | "unsupported" | "blocked" | "not_verified";

export type RestorePointComponent = {
  key: string;
  label: string;
  status: RestorePointComponentStatus;
  details: string;
  required_next_action?: string;
};

export type RestorePointSummary = {
  backup_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  backup_version: string | null;
  package_path_available: boolean;
  package_sha256_available: boolean;
  package_size_bytes: number | null;
  supported_package_complete: boolean;
  full_project_recovery_complete: boolean;
  complete_recovery_manifest_present: boolean;
  complete_recovery_inventory_complete: boolean;
  actual_package_contents_verified: boolean;
  available_for_selected_timestamp: boolean;
  total_records: number;
  total_storage_files: number;
  missing_required_tables: string[];
  missing_required_buckets: string[];
  components: RestorePointComponent[];
  blockers: string[];
  warnings: string[];
};

export type RestorePointInventory = {
  generated_at: string;
  backup_version_expected: string;
  selected_at?: string;
  selected_timestamp_status: "not_selected" | "available" | "unavailable";
  selected_restore_point?: RestorePointSummary;
  restore_points: RestorePointSummary[];
  provider_pitr: {
    verified: boolean;
    status: "not_configured" | "not_verified";
    details: string;
  };
  restore_writes_supported: boolean;
  full_project_recovery_supported: boolean;
  notes: string[];
};

export type BackupJobForRestorePoint = {
  id: string;
  status: string | null;
  backup_version: string | null;
  package_path: string | null;
  package_sha256: string | null;
  package_size_bytes: number | null;
  manifest: BackupManifest | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at: string | null;
  created_at: string;
};

function isValidDate(value: string | null | undefined) {
  if (!value) return false;
  return Number.isFinite(new Date(value).getTime());
}

function sameRestorePointMinute(left: string | null | undefined, right: string | null | undefined) {
  if (!isValidDate(left) || !isValidDate(right)) return false;
  return new Date(left as string).toISOString().slice(0, 16) === new Date(right as string).toISOString().slice(0, 16);
}

function sumRecordCounts(manifest: BackupManifest | null) {
  if (!manifest?.row_counts) return 0;
  return Object.values(manifest.row_counts).reduce((sum, value) => sum + Number(value || 0), 0);
}

function sumStorageObjects(manifest: BackupManifest | null) {
  if (!manifest?.buckets) return 0;
  return manifest.buckets.reduce((sum, bucket) => sum + Number(bucket.object_count || 0), 0);
}

function buildSupportedPackageComponents(params: {
  job: BackupJobForRestorePoint;
  missingRequiredTables: string[];
  missingRequiredBuckets: string[];
  packageMetadataComplete: boolean;
  manifestVersionCompatible: boolean;
}) {
  const { job, missingRequiredTables, missingRequiredBuckets, packageMetadataComplete, manifestVersionCompatible } = params;
  const manifest = job.manifest;
  const components: RestorePointComponent[] = [];

  components.push({
    key: "database_public_data",
    label: "Database table data",
    status: job.status === "completed" && missingRequiredTables.length === 0 && manifestVersionCompatible ? "recoverable" : "blocked",
    details: missingRequiredTables.length === 0
      ? `${requiredTables.length} required public tables are listed in the backup manifest.`
      : `Missing required table exports: ${missingRequiredTables.join(", ")}.`,
    required_next_action: missingRequiredTables.length === 0 ? undefined : "Create a new complete backup package after required table exports are available.",
  });

  components.push({
    key: "storage_objects",
    label: "Storage objects",
    status: job.status === "completed" && missingRequiredBuckets.length === 0 && manifestVersionCompatible ? "recoverable" : "blocked",
    details: missingRequiredBuckets.length === 0
      ? `${requiredBuckets.length} required Storage bucket inventories are listed in the backup manifest.`
      : `Missing required bucket inventories: ${missingRequiredBuckets.join(", ")}.`,
    required_next_action: missingRequiredBuckets.length === 0 ? undefined : "Create a new complete backup package after required bucket exports are available.",
  });

  components.push({
    key: "package_integrity_metadata",
    label: "Package checksums and manifest metadata",
    status: packageMetadataComplete && manifestVersionCompatible ? "recoverable" : "blocked",
    details: packageMetadataComplete
      ? "Package path, package SHA-256, package size, manifest file list, and per-file checksums are recorded."
      : "Package path, package SHA-256, package size, manifest file list, or per-file checksums are missing.",
    required_next_action: packageMetadataComplete ? undefined : "Keep only completed backup jobs with package metadata and downloadable archive parts.",
  });

  return components;
}

function buildUnsupportedProjectComponents() {
  return [
    {
      key: "database_schema",
      label: "Database schema, indexes, constraints, functions, triggers, and RLS policies",
      status: "unsupported" as const,
      details: "Current backup packages contain table data exports, not a schema dump, migration snapshot, functions, triggers, indexes, constraints, or RLS policy definitions.",
      required_next_action: "Add a provider-supported schema export or verified migration restore process before declaring full project recovery complete.",
    },
    {
      key: "supabase_auth_users",
      label: "Supabase Auth users and identities",
      status: "unsupported" as const,
      details: "The manifest explicitly records that Supabase Auth users are not included in the backup package.",
      required_next_action: "Use platform-supported Auth export/restore or an authorized identity reconciliation process.",
    },
    {
      key: "application_source",
      label: "Application source and build configuration",
      status: "unsupported" as const,
      details: "Backup packages do not include Git history, source files, package lockfiles, Vercel configuration, or deployment artifacts.",
      required_next_action: "Use version control and deployment restore points outside the database backup package.",
    },
    {
      key: "environment_integrations",
      label: "Environment variables, integrations, schedules, and webhooks",
      status: "not_verified" as const,
      details: "Secret values and external integration configuration are intentionally not stored in backup packages or browser-visible reports.",
      required_next_action: "Maintain a separate secret inventory and provider-level integration recovery runbook.",
    },
  ];
}

export function buildRestorePointSummary(job: BackupJobForRestorePoint, selectedAt?: string): RestorePointSummary {
  const manifest = job.manifest;
  const manifestTables = new Set((manifest?.tables || []).map((table) => table.table));
  const manifestBuckets = new Set((manifest?.buckets || []).map((bucket) => bucket.bucket));
  const missingRequiredTables = requiredTables.filter((table) => !manifestTables.has(table));
  const missingRequiredBuckets = requiredBuckets.filter((bucket) => !manifestBuckets.has(bucket));
  const manifestVersionCompatible = manifest?.backup_version === backupVersion && job.backup_version === backupVersion;
  const packageMetadataComplete = Boolean(job.package_path && job.package_sha256 && job.package_size_bytes && manifest?.file_list?.length && Object.keys(manifest?.sha256_checksums || {}).length);
  const supportedPackageComplete = job.status === "completed"
    && Boolean(manifest)
    && manifestVersionCompatible
    && packageMetadataComplete
    && missingRequiredTables.length === 0
    && missingRequiredBuckets.length === 0;
  const completeRecoverySummary = manifest?.complete_recovery_manifest?.summary;
  const selectedMatches = Boolean(selectedAt)
    && (sameRestorePointMinute(job.completed_at, selectedAt) || sameRestorePointMinute(manifest?.created_at, selectedAt) || sameRestorePointMinute(job.created_at, selectedAt));

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (job.status !== "completed") blockers.push(`Backup job status is ${job.status || "unknown"}, not completed.`);
  if (!manifest) blockers.push("Backup manifest is missing.");
  if (!manifestVersionCompatible) blockers.push(`Backup version is incompatible or unavailable. Expected ${backupVersion}.`);
  if (!packageMetadataComplete) blockers.push("Package metadata or checksum inventory is incomplete.");
  if (missingRequiredTables.length > 0) blockers.push(`Required table exports missing: ${missingRequiredTables.join(", ")}.`);
  if (missingRequiredBuckets.length > 0) blockers.push(`Required bucket exports missing: ${missingRequiredBuckets.join(", ")}.`);
  if (!manifest?.complete_recovery_manifest) blockers.push("Complete recovery manifest v1 is missing; this is a legacy supported-package backup, not a complete project recovery point.");
  if (completeRecoverySummary?.blockers?.length) blockers.push(...completeRecoverySummary.blockers);

  warnings.push("This restore point covers only the components currently included in the backup package; it is not a complete historical project restore point.");
  warnings.push("A timestamp is available only when backed by a completed backup package at that recorded time or a separately verified provider PITR mechanism.");

  const components = [
    ...buildSupportedPackageComponents({
      job,
      missingRequiredTables,
      missingRequiredBuckets,
      packageMetadataComplete,
      manifestVersionCompatible,
    }),
    ...buildUnsupportedProjectComponents(),
  ];

  return {
    backup_id: job.id,
    status: job.status || "unknown",
    created_at: manifest?.created_at || job.created_at,
    completed_at: job.completed_at,
    backup_version: manifest?.backup_version || job.backup_version,
    package_path_available: Boolean(job.package_path),
    package_sha256_available: Boolean(job.package_sha256),
    package_size_bytes: job.package_size_bytes,
    supported_package_complete: supportedPackageComplete,
    full_project_recovery_complete: Boolean(completeRecoverySummary?.full_project_recovery_complete),
    complete_recovery_manifest_present: Boolean(manifest?.complete_recovery_manifest),
    complete_recovery_inventory_complete: Boolean(completeRecoverySummary?.recovery_inventory_complete),
    actual_package_contents_verified: Boolean(completeRecoverySummary?.actual_package_contents_verified),
    available_for_selected_timestamp: selectedMatches,
    total_records: sumRecordCounts(manifest),
    total_storage_files: sumStorageObjects(manifest),
    missing_required_tables: missingRequiredTables,
    missing_required_buckets: missingRequiredBuckets,
    components,
    blockers,
    warnings,
  };
}

export function buildRestorePointInventory(backups: BackupJobForRestorePoint[], selectedAt?: string): RestorePointInventory {
  const restorePoints = backups
    .map((job) => buildRestorePointSummary(job, selectedAt))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const selectedRestorePoint = selectedAt
    ? restorePoints.find((point) => point.available_for_selected_timestamp)
    : undefined;

  return {
    generated_at: new Date().toISOString(),
    backup_version_expected: backupVersion,
    selected_at: selectedAt,
    selected_timestamp_status: selectedAt ? (selectedRestorePoint ? "available" : "unavailable") : "not_selected",
    selected_restore_point: selectedRestorePoint,
    restore_points: restorePoints,
    provider_pitr: {
      verified: false,
      status: "not_verified",
      details: "No provider-supported point-in-time recovery configuration is verified by this application-layer inventory.",
    },
    restore_writes_supported: false,
    full_project_recovery_supported: false,
    notes: [
      "Completed backup packages can validate supported database table data and Storage object inventory only.",
      "Historical date/time recovery is unavailable unless a completed backup package exists at the selected time or provider PITR is separately verified.",
      "Real restore writes remain blocked without an independently verified destination connection.",
    ],
  };
}