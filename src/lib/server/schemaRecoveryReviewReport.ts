import { backupVersion } from "./backupConfig";
import { extractBackupVerificationEvidenceFromManifest, summarizeBackupVerificationEvidence, type BackupVerificationEvidenceSummary } from "./backupVerificationEvidence";
import { buildRestorePointInventory, type BackupJobForRestorePoint } from "./backupRestorePointInventory";
import { buildDatabaseSchemaRecoveryInventory, type DatabaseSchemaRecoveryCategory } from "./databaseSchemaRecoveryManifest";
import type { SchemaDependencyEvidenceType, SchemaDependencyPlan } from "./schemaDependencyPlanner";

export const schemaRecoveryReviewReportVersion = "2026-10-26.schema-recovery-review-v1";

export type ReviewStatus = "verified" | "repository_evidence_only" | "unverified" | "blocked" | "missing";

export type SchemaRecoveryReviewFinding = {
  key: string;
  label: string;
  status: ReviewStatus;
  evidence_source: string;
  details: string;
  blockers: string[];
  warnings: string[];
};

export type SchemaRecoveryReviewReport = {
  report_version: typeof schemaRecoveryReviewReportVersion;
  generated_at: string;
  source: {
    schema_inventory: "repository_derived";
    live_database: "not_queried_by_report_builder";
    stored_package_verification: "recorded_evidence_only";
  };
  backup_evidence: {
    backups_examined: number;
    latest_restore_point_id: string | null;
    consistency_model: string;
    consistency_classification: string;
    supported_package_complete: boolean;
    stored_package_verification_status: BackupVerificationEvidenceSummary["status"];
    latest_stored_package_verification: BackupVerificationEvidenceSummary;
  };
  schema_inventory: {
    version: string;
    source: string;
    repository_inventory_available: boolean;
    live_database_schema_captured: boolean;
    complete_schema_recovery_supported: boolean;
    migration_file_count: number;
    latest_migration_file?: string;
    schema_fingerprint_available: boolean;
    categories: Array<{
      key: string;
      label: string;
      status: ReviewStatus;
      present_in_repository: boolean;
      captured_by_backup_system: boolean;
      recovery_procedure_status: string;
      blockers: string[];
      limitations: string[];
    }>;
  };
  dependency_plan: {
    available: boolean;
    planner_version?: string;
    readiness: string;
    object_counts_by_category: Record<string, number>;
    dependency_counts: Record<SchemaDependencyEvidenceType | "total", number>;
    resolved_dependency_count: number;
    unresolved_dependency_count: number;
    cycle_count: number;
    missing_definition_count: number;
    unsupported_object_count: number;
    cycles: Array<{ node_ids: string[] }>;
    missing_definitions: string[];
    unsupported_object_types: string[];
  };
  recovery_status: {
    database_consistency: ReviewStatus;
    storage_recovery: ReviewStatus;
    auth_recovery: ReviewStatus;
    database_to_storage_validation: ReviewStatus;
    full_project_recovery: ReviewStatus;
    restore_writes: "blocked";
  };
  findings: SchemaRecoveryReviewFinding[];
  blockers: string[];
  warnings: string[];
  excluded_side_effect_helpers: string[];
};

export type BuildSchemaRecoveryReviewReportInput = {
  backupJobs?: BackupJobForRestorePoint[];
  generatedAt?: string;
  projectRoot?: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function categoryStatus(category: DatabaseSchemaRecoveryCategory): ReviewStatus {
  if (category.captured_by_backup_system && category.recovery_procedure_status === "tested") return "verified";
  if (category.present_in_repository) return "repository_evidence_only";
  if (category.blockers.length > 0) return "blocked";
  return "unverified";
}

function countDependencyEvidence(plan?: SchemaDependencyPlan) {
  const counts: Record<SchemaDependencyEvidenceType | "total", number> = {
    explicit: 0,
    inferred: 0,
    unknown: 0,
    total: 0,
  };

  for (const node of plan?.nodes || []) {
    for (const evidence of node.dependency_evidence || []) {
      counts[evidence.evidence_type] += 1;
      counts.total += 1;
    }
  }

  return counts;
}

function buildFindings(input: {
  categories: DatabaseSchemaRecoveryCategory[];
  plan?: SchemaDependencyPlan;
  latestRestorePoint: ReturnType<typeof buildRestorePointInventory>["restore_points"][number] | undefined;
  verificationEvidence: BackupVerificationEvidenceSummary;
}): SchemaRecoveryReviewFinding[] {
  const { categories, plan, latestRestorePoint, verificationEvidence } = input;

  return [
    {
      key: "schema_inventory",
      label: "Schema recovery inventory",
      status: categories.length > 0 ? "repository_evidence_only" : "missing",
      evidence_source: "Repository migrations and generated database types",
      details: "Schema recovery evidence is repository-derived only and is not a live database schema snapshot.",
      blockers: categories.flatMap((category) => category.blockers.map((blocker) => `${category.label}: ${blocker}`)).slice(0, 30),
      warnings: ["Repository evidence does not prove that the protected live database matches the repository schema."],
    },
    {
      key: "dependency_planner",
      label: "Schema dependency planner",
      status: plan?.summary.readiness === "blocked" ? "blocked" : plan ? "repository_evidence_only" : "missing",
      evidence_source: "Repository migration parser",
      details: plan ? `Planner readiness is ${plan.summary.readiness}.` : "No dependency plan is available.",
      blockers: plan?.summary.blockers || ["No schema dependency plan is available."],
      warnings: plan?.summary.warnings || [],
    },
    {
      key: "backup_consistency",
      label: "Backup consistency",
      status: latestRestorePoint?.consistency_model === "best_effort_sequential_export" ? "unverified" : "missing",
      evidence_source: "Restore-point consistency manifest",
      details: latestRestorePoint?.consistency_model
        ? `Latest restore point consistency model is ${latestRestorePoint.consistency_model}.`
        : "No restore-point consistency evidence is available.",
      blockers: latestRestorePoint?.blockers || ["No completed restore-point evidence is available."],
      warnings: latestRestorePoint?.warnings || [],
    },
    {
      key: "stored_package_verification",
      label: "Stored package verification",
      status: verificationEvidence.evidence_available && verificationEvidence.status === "verified" ? "verified" : "unverified",
      evidence_source: "Previously recorded verification evidence only",
      details: verificationEvidence.evidence_available
        ? `Latest recorded package verification status is ${verificationEvidence.status}. Evidence reflects only the recorded event at ${verificationEvidence.verification_completed_at || "unknown time"}.`
        : "No persisted verification evidence is available. This review endpoint does not retrieve or download stored backup packages.",
      blockers: verificationEvidence.blockers,
      warnings: verificationEvidence.warnings,
    },
    {
      key: "full_project_recovery",
      label: "Full-project recovery",
      status: "blocked",
      evidence_source: "Complete recovery, consistency, schema inventory, and restore-point metadata",
      details: "Full-project recovery remains blocked until schema, Auth, storage consistency, application, environment, operations, and destination recovery evidence are verified.",
      blockers: [
        "No authorized destination restore target is configured.",
        "Restore writes remain blocked.",
        "Supabase Auth recovery is not implemented or verified.",
        "Application source, environment, secrets, integrations, webhooks, and scheduled jobs are not included in the backup package.",
      ],
      warnings: ["This report is review-only and does not authorize restore execution."],
    },
  ];
}

export function buildSchemaRecoveryReviewReport(input: BuildSchemaRecoveryReviewReportInput = {}): SchemaRecoveryReviewReport {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const backupJobs = input.backupJobs || [];
  const schemaInventory = buildDatabaseSchemaRecoveryInventory({
    backupId: "schema-recovery-review-report",
    backupVersion,
    generatedAt,
    projectRoot: input.projectRoot,
  });
  const restorePointInventory = buildRestorePointInventory(backupJobs);
  const latestRestorePoint = restorePointInventory.restore_points[0];
  const latestEvidenceRecord = backupJobs
    .map((job) => extractBackupVerificationEvidenceFromManifest(job.manifest, job.id))
    .filter((record): record is NonNullable<typeof record> => Boolean(record))
    .sort((left, right) => String(right.verification_completed_at || "").localeCompare(String(left.verification_completed_at || "")))[0] || null;
  const verificationEvidence = summarizeBackupVerificationEvidence(latestEvidenceRecord);
  const plan = schemaInventory.schema_dependency_plan;
  const dependencyCounts = countDependencyEvidence(plan);
  const findings = buildFindings({ categories: schemaInventory.categories, plan, latestRestorePoint, verificationEvidence });

  const blockers = unique([
    ...schemaInventory.summary.blockers,
    ...(plan?.summary.blockers || []),
    ...(latestRestorePoint?.blockers || []),
    ...findings.flatMap((finding) => finding.blockers),
  ]);

  const warnings = unique([
    ...schemaInventory.summary.warnings,
    ...(plan?.summary.warnings || []),
    ...(latestRestorePoint?.warnings || []),
    ...restorePointInventory.notes,
    ...findings.flatMap((finding) => finding.warnings),
  ]);

  return {
    report_version: schemaRecoveryReviewReportVersion,
    generated_at: generatedAt,
    source: {
      schema_inventory: "repository_derived",
      live_database: "not_queried_by_report_builder",
      stored_package_verification: "recorded_evidence_only",
    },
    backup_evidence: {
      backups_examined: backupJobs.length,
      latest_restore_point_id: latestRestorePoint?.backup_id || null,
      consistency_model: latestRestorePoint?.consistency_model || "unknown",
      consistency_classification: latestRestorePoint?.consistency_classification || "unknown",
      supported_package_complete: Boolean(latestRestorePoint?.supported_package_complete),
      stored_package_verification_status: verificationEvidence.status,
      latest_stored_package_verification: verificationEvidence,
    },
    schema_inventory: {
      version: schemaInventory.schema_recovery_manifest_version,
      source: schemaInventory.schema_source,
      repository_inventory_available: schemaInventory.summary.repository_inventory_available,
      live_database_schema_captured: schemaInventory.summary.live_database_schema_captured,
      complete_schema_recovery_supported: schemaInventory.summary.complete_schema_recovery_supported,
      migration_file_count: schemaInventory.repository_evidence.migration_file_count,
      latest_migration_file: schemaInventory.repository_evidence.latest_migration_file,
      schema_fingerprint_available: schemaInventory.summary.schema_fingerprint_available,
      categories: schemaInventory.categories.map((category) => ({
        key: category.key,
        label: category.label,
        status: categoryStatus(category),
        present_in_repository: category.present_in_repository,
        captured_by_backup_system: category.captured_by_backup_system,
        recovery_procedure_status: category.recovery_procedure_status,
        blockers: category.blockers,
        limitations: category.limitations,
      })),
    },
    dependency_plan: {
      available: Boolean(plan),
      planner_version: plan?.planner_version,
      readiness: plan?.summary.readiness || "inventory_only",
      object_counts_by_category: plan?.summary.total_objects_by_category || {},
      dependency_counts: dependencyCounts,
      resolved_dependency_count: plan?.summary.resolved_dependency_count || 0,
      unresolved_dependency_count: plan?.summary.unresolved_dependency_count || 0,
      cycle_count: plan?.summary.cycle_count || 0,
      missing_definition_count: plan?.summary.missing_definition_count || 0,
      unsupported_object_count: plan?.summary.unsupported_object_count || 0,
      cycles: plan?.cycles || [],
      missing_definitions: plan?.missing_definitions || [],
      unsupported_object_types: plan?.unsupported_object_types || [],
    },
    recovery_status: {
      database_consistency: latestRestorePoint?.consistency_model === "best_effort_sequential_export" ? "unverified" : "missing",
      storage_recovery: latestRestorePoint?.components?.some((component) => component.key === "storage_objects" && component.status === "recoverable") ? "repository_evidence_only" : "unverified",
      auth_recovery: "blocked",
      database_to_storage_validation: "unverified",
      full_project_recovery: "blocked",
      restore_writes: "blocked",
    },
    findings,
    blockers,
    warnings,
    excluded_side_effect_helpers: [
      "verifyStoredBackupPackage was intentionally not called because it downloads backup package bytes.",
      "restore-upload and restore engine helpers were intentionally not called because this endpoint is review-only.",
      "No SQL execution, migration execution, Storage mutation, restore job creation, or audit-log write helper is called by this report builder.",
    ],
  };
}