---
title: Restore-point consistency manifest v1
status: done
priority: high
type: feature
tags: [disaster-recovery, backups, consistency, manifest]
created_by: agent
created_at: 2026-10-26T18:30:44Z
position: 254
---

## Notes
Implemented a versioned `restore_point_consistency` section in Royalty Stamp backup manifests. New backups now record a distinct restore-point ID, declared timestamp, actual application-observed phase timings for database export, Storage inventory, Storage download, and package finalization, plus package upload completion once the existing backup job completes. The current consistency model is truthfully recorded as `best_effort_sequential_export`, not a transactionally consistent database snapshot, cross-component snapshot, or full-project recovery point.

Files changed:
- `src/lib/server/restorePointConsistencyManifest.ts`
- `src/lib/server/backupConfig.ts`
- `src/lib/server/backupEngine.ts`
- `src/lib/server/backupValidator.ts`
- `src/lib/server/backupStoredPackageVerification.ts`
- `src/lib/server/backupRestorePointInventory.ts`
- `scripts/test-restore-point-consistency-manifest.mjs`
- `.softgen/tasks/task-254.md`

Consistency metadata added:
- `consistency_manifest_version: 2026-10-26.restore-point-consistency-v1`
- `restore_point_id`
- `backup_id`
- `declared_timestamp`
- `consistency_model`
- database export start/end timestamps
- Storage inventory start/end timestamps
- Storage download start/end timestamps
- package finalization timestamp
- package upload completion timestamp when the existing backup flow completes
- backup completion state
- component evidence entries
- blockers and warnings
- deterministic consistency summary

Validation rules implemented:
- Legacy packages without `restore_point_consistency` remain readable and are treated as best-effort/unverified.
- Best-effort sequential exports must not claim verified database snapshot evidence.
- Database-consistent claims require verified database snapshot or provider PITR evidence.
- Cross-component consistency claims require verified database consistency evidence, verified Storage snapshot/version evidence, and verified database-to-Storage reference validation.
- Full-project recoverable claims require verified evidence for database consistency, Storage consistency, database-to-Storage validation, schema/database-object recovery, Auth recovery, and application/operations recovery.
- Malformed timing fields, missing required evidence entries, unsupported versions, mismatched backup IDs, and contradictory summaries fail validation.

Checks run:
- `node scripts/test-restore-point-consistency-manifest.mjs` passed.
- `check_for_errors` passed with no CSS, lint, TypeScript, or server errors.

Remaining unverified provider capabilities:
- Provider PITR availability/configuration.
- Database snapshot export support.
- Storage snapshot/version/generation support.
- Complete database-to-Storage reference validation.
- Supabase Auth export/import or approved reconciliation.
- Full schema, RLS, function, trigger, index, constraint, extension, migration, and sequence-state recovery.
- Application source, deployment, environment/secret, external integration, webhook, and scheduled-job recovery.

Safety confirmation:
No SQL, migrations, restores, destructive commands, production database changes, Storage recovery operations, environment changes, credential changes, project-link changes, deployments, Stamp Flow changes, or Quick Stamp changes were performed. Restore writes remain blocked.

## Checklist
- [x] Inspect current backup manifest, backup creation, complete recovery manifest, validator, stored package verification, and restore-point inventory code
- [x] Define typed restore-point consistency manifest v1 model and validation rules
- [x] Integrate actual backup phase timings into newly generated backup manifests without estimating unavailable values
- [x] Extend validation to reject malformed or contradictory consistency claims while keeping legacy packages compatible
- [x] Surface consistency evidence in stored package verification and restore-point inventory where appropriate
- [x] Add focused isolated tests for best-effort classification, false consistency claims, legacy compatibility, and incomplete backups
- [x] Run tests and static checks, then report files changed, validation rules, remaining blockers, and safety confirmation

## Acceptance
New backups include a versioned restore-point consistency manifest that truthfully classifies current exports as `best_effort_sequential_export`.
Validation prevents database-consistent, cross-component-consistent, or full-project-recoverable claims without required evidence.
Legacy backup packages remain readable under existing compatibility rules.
Restore writes remain blocked and no database, Storage, environment, project-link, deployment, Stamp Flow, or Quick Stamp changes occur.