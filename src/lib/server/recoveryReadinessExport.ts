import { schemaRecoveryReviewReportVersion, type SchemaRecoveryReviewReport, type ReviewStatus } from "./schemaRecoveryReviewReport";

export const recoveryReadinessExportVersion = "2026-10-26.recovery-readiness-export-v1";

export type RecoveryReadinessClassification =
  | "best_effort_export"
  | "internally_validated_package"
  | "database_consistent_snapshot"
  | "cross_component_consistent_restore_point";

export type RecoveryRoadmapItem = {
  priority: number;
  phase: string;
  recovery_capability: string;
  current_evidence: string;
  gap: string;
  required_prerequisite: string;
  safe_next_action: string;
  validation_method: string;
  risk_if_unresolved: string;
};

export type RecoveryReadinessExport = {
  report_format_version: typeof recoveryReadinessExportVersion;
  generated_at: string;
  source_report_version: typeof schemaRecoveryReviewReportVersion;
  explicit_disclaimer: string;
  current_recovery_classification: RecoveryReadinessClassification;
  overall_recovery_readiness: {
    verdict: "blocked_for_full_project_recovery";
    restore_writes: "blocked";
    arbitrary_historical_datetime_recovery: "not_verified";
    limitations: string[];
  };
  schema_recovery_inventory_status: SchemaRecoveryReviewReport["schema_inventory"];
  dependency_planner_status: SchemaRecoveryReviewReport["dependency_plan"];
  recovery_blockers: SchemaRecoveryReviewReport["dependency_plan"]["classified_blockers"];
  legacy_blocker_messages: string[];
  consistency_limitations: {
    database_consistency: ReviewStatus;
    consistency_model: string;
    consistency_classification: string;
    provider_pitr_status: "not_verified";
    statement: string;
  };
  component_recovery_status: SchemaRecoveryReviewReport["recovery_status"];
  stored_package_verification_evidence: SchemaRecoveryReviewReport["backup_evidence"]["latest_stored_package_verification"];
  evidence_sources: SchemaRecoveryReviewReport["findings"];
  external_provider_capabilities_required: string[];
  application_deployment_integration_requirements: string[];
  prioritized_recovery_roadmap: RecoveryRoadmapItem[];
  warnings: string[];
  excluded_operations: string[];
};

function classifyCurrentRecovery(review: SchemaRecoveryReviewReport): RecoveryReadinessClassification {
  if (review.backup_evidence.consistency_classification === "cross_component_consistent_restore_point") return "cross_component_consistent_restore_point";
  if (review.backup_evidence.consistency_classification === "database_consistent_snapshot") return "database_consistent_snapshot";
  if (review.backup_evidence.stored_package_verification_status === "verified") return "internally_validated_package";
  return "best_effort_export";
}

function buildRoadmap(review: SchemaRecoveryReviewReport): RecoveryRoadmapItem[] {
  return [
    {
      priority: 1,
      phase: "Evidence and inventory correctness",
      recovery_capability: "Portable classified readiness evidence",
      current_evidence: `Schema Recovery Review ${review.report_version} with ${review.dependency_plan.classified_blockers.length} classified dependency blocker(s).`,
      gap: "Evidence is review-only and must be carried into provider/operator authorization workflows.",
      required_prerequisite: "Superadmin review of exported evidence.",
      safe_next_action: "Use this JSON report for provider and operations review without enabling restore writes.",
      validation_method: "Confirm blocker IDs, evidence sources, and unverified statuses remain present in the export.",
      risk_if_unresolved: "Recovery decisions may rely on screenshots or incomplete context.",
    },
    {
      priority: 2,
      phase: "Backup completeness",
      recovery_capability: "Persisted stored-package verification evidence",
      current_evidence: `Latest recorded verification status is ${review.backup_evidence.stored_package_verification_status}.`,
      gap: "Durable verification evidence is available only if previously recorded in metadata; this export does not revalidate archives.",
      required_prerequisite: "Authorized persistence mechanism for verification evidence.",
      safe_next_action: "Design an admin-only evidence store before claiming persisted verification history.",
      validation_method: "Focused tests proving review/export endpoints do not download archives.",
      risk_if_unresolved: "Stored package validation outcomes may be transient or absent from later reviews.",
    },
    {
      priority: 3,
      phase: "Historical consistency",
      recovery_capability: "Database-consistent snapshot or PITR marker",
      current_evidence: `Current consistency classification is ${review.backup_evidence.consistency_classification}.`,
      gap: "No verified database snapshot, WAL position, or provider PITR reference is available in the review evidence.",
      required_prerequisite: "Provider-supported PITR/snapshot evidence and explicit authorization.",
      safe_next_action: "Define non-mutating PITR evidence requirements with the provider.",
      validation_method: "Provider evidence review without connecting this app to production.",
      risk_if_unresolved: "Arbitrary date/time recovery remains unsupported.",
    },
    {
      priority: 4,
      phase: "Schema reconstruction",
      recovery_capability: "Verified schema export and dependency-aware reconstruction",
      current_evidence: `Planner readiness is ${review.dependency_plan.readiness}; live schema capture is ${review.schema_inventory.live_database_schema_captured ? "present" : "absent"}.`,
      gap: "Schema evidence is repository-derived and not verified against live database catalogs.",
      required_prerequisite: "Authorized non-mutating schema export or independently approved destination review.",
      safe_next_action: "Prepare a schema export/compare plan; do not execute SQL from this export.",
      validation_method: "Compare repository planner output with authorized provider schema evidence.",
      risk_if_unresolved: "Restored data may not have compatible tables, policies, functions, indexes, or grants.",
    },
    {
      priority: 5,
      phase: "Auth recovery",
      recovery_capability: "Supabase Auth users, identities, and provider metadata",
      current_evidence: `Auth recovery status is ${review.recovery_status.auth_recovery}.`,
      gap: "Supabase Auth users and identities are provider-managed and not captured as application table data.",
      required_prerequisite: "Provider-supported Auth export/restore or approved identity reconciliation.",
      safe_next_action: "Request provider Auth recovery capability confirmation.",
      validation_method: "Authorized provider documentation or isolated test project evidence.",
      risk_if_unresolved: "Users may not be able to sign in after a data restore.",
    },
    {
      priority: 6,
      phase: "Storage recovery",
      recovery_capability: "Storage snapshot, object bytes, metadata, and DB-to-Storage validation",
      current_evidence: `Storage recovery status is ${review.recovery_status.storage_recovery}; DB-to-Storage validation is ${review.recovery_status.database_to_storage_validation}.`,
      gap: "No verified Storage snapshot/version marker or complete DB-to-Storage graph validation is present.",
      required_prerequisite: "Storage snapshot/versioning policy and reference validation design.",
      safe_next_action: "Define a non-mutating DB-to-Storage reference validation inventory.",
      validation_method: "Read-only graph report from authorized backup metadata.",
      risk_if_unresolved: "Restored rows may reference missing, stale, or deleted objects.",
    },
    {
      priority: 7,
      phase: "Application and operational recovery",
      recovery_capability: "Source, deploy config, secrets, webhooks, callbacks, and integrations",
      current_evidence: "Review report identifies these as external runbook requirements.",
      gap: "Backup packages do not include deployment/provider state or secret values.",
      required_prerequisite: "Version-control, deployment, domain, callback, webhook, and secret-manager runbooks.",
      safe_next_action: "Create a non-secret operational recovery checklist.",
      validation_method: "Operator review with confidential configuration values kept outside browser-visible exports.",
      risk_if_unresolved: "Recovered data may not correspond to a working application environment.",
    },
    {
      priority: 8,
      phase: "Authorized destination setup",
      recovery_capability: "Independently verified isolated restore destination",
      current_evidence: `Restore writes are ${review.recovery_status.restore_writes}.`,
      gap: "No destination restore target is authorized by this export.",
      required_prerequisite: "Explicit destination authorization and server-side verification.",
      safe_next_action: "Draft a destination authorization checklist.",
      validation_method: "Fail-closed preflight and destination identity checks.",
      risk_if_unresolved: "Restore work could risk production or unapproved environments.",
    },
    {
      priority: 9,
      phase: "End-to-end restore testing",
      recovery_capability: "Dry-run and post-restore validation evidence",
      current_evidence: "Review/reporting endpoints are implemented; full restore testing is not authorized by this export.",
      gap: "No end-to-end restore evidence is included.",
      required_prerequisite: "Authorized destination plus verified backup/schema/Auth/Storage prerequisites.",
      safe_next_action: "Run only read-only preflight until external authorization exists.",
      validation_method: "Preflight reports and isolated destination post-checks after authorization.",
      risk_if_unresolved: "Recovery remains theoretical.",
    },
    {
      priority: 10,
      phase: "Production recovery readiness",
      recovery_capability: "Full-project recoverable restore point",
      current_evidence: `Full-project recovery is ${review.recovery_status.full_project_recovery}.`,
      gap: "Required components remain blocked or unverified.",
      required_prerequisite: "Completion of evidence, consistency, schema, Auth, Storage, app/ops, destination, and E2E phases.",
      safe_next_action: "Keep full-project readiness blocked until every component has verified evidence.",
      validation_method: "Human approval backed by successful isolated restore evidence.",
      risk_if_unresolved: "False confidence during an incident.",
    },
  ];
}

export function buildRecoveryReadinessExport(review: SchemaRecoveryReviewReport): RecoveryReadinessExport {
  const classification = classifyCurrentRecovery(review);

  return {
    report_format_version: recoveryReadinessExportVersion,
    generated_at: review.generated_at,
    source_report_version: review.report_version,
    explicit_disclaimer: "This report exports Disaster Recovery readiness evidence only. It is not a backup, restore point, archive validation, restore authorization, SQL plan, or proof that Royalty Stamp can be restored to an arbitrary historical date and time.",
    current_recovery_classification: classification,
    overall_recovery_readiness: {
      verdict: "blocked_for_full_project_recovery",
      restore_writes: "blocked",
      arbitrary_historical_datetime_recovery: "not_verified",
      limitations: [
        "Repository-derived schema evidence does not prove protected live database state.",
        "A valid package or recorded package verification does not prove historical consistency.",
        "Supabase Auth, Storage snapshots, application deployment, environment secrets, and provider integrations require separate evidence.",
        "Restore writes remain blocked until an independently authorized destination is verified server-side.",
      ],
    },
    schema_recovery_inventory_status: review.schema_inventory,
    dependency_planner_status: review.dependency_plan,
    recovery_blockers: review.dependency_plan.classified_blockers,
    legacy_blocker_messages: review.blockers,
    consistency_limitations: {
      database_consistency: review.recovery_status.database_consistency,
      consistency_model: review.backup_evidence.consistency_model,
      consistency_classification: review.backup_evidence.consistency_classification,
      provider_pitr_status: "not_verified",
      statement: "Current evidence does not establish a transactionally consistent database snapshot, cross-component restore point, or full-project recoverable restore point.",
    },
    component_recovery_status: review.recovery_status,
    stored_package_verification_evidence: review.backup_evidence.latest_stored_package_verification,
    evidence_sources: review.findings,
    external_provider_capabilities_required: [
      "Supabase database PITR or non-mutating schema/catalog export evidence.",
      "Supabase Auth export/restore or approved identity reconciliation capability.",
      "Supabase Storage snapshot/versioning or object-generation recovery evidence.",
      "Authorized isolated destination project with server-side destination identity verification.",
      "Secret-manager, deployment, webhook, domain, callback, and external integration recovery runbooks.",
    ],
    application_deployment_integration_requirements: [
      "Version-control reference for application source and lockfiles.",
      "Deployment provider configuration and domain/redirect settings.",
      "Environment variable name inventory without confidential contents.",
      "Secure credential recovery procedure outside browser-visible reports.",
      "External payment, email, webhook, scheduled-job, and callback configuration runbooks.",
    ],
    prioritized_recovery_roadmap: buildRoadmap(review),
    warnings: review.warnings,
    excluded_operations: [
      ...review.excluded_side_effect_helpers,
      "This export endpoint does not call stored-package validation, archive download, restore-upload, restore engine, SQL execution, migration execution, Storage mutation, Auth mutation, or deployment helpers.",
      "PDF export is not implemented in this task because no existing PDF generation mechanism is present in the inspected project dependencies.",
    ],
  };
}