---
title: Complete recovery manifest v1
status: done
priority: urgent
type: feature
tags: [disaster-recovery, backups, manifest, recovery]
created_by: agent
created_at: 2026-10-26T18:16:15Z
position: 253
---

## Notes
Implemented a versioned `complete_recovery_manifest` section for Royalty Stamp backups. The manifest inventories all required complete historical recovery components across database, authentication/authorization, storage, application, operations, and package integrity. It records component evidence and status using explicit statuses: `captured`, `verified`, `unsupported`, `requires_provider`, `requires_external_runbook`, and `not_verified`. It preserves existing backup format compatibility, does not export secrets, does not implement schema/Auth/provider recovery, and does not enable restore writes. Validation now accepts legacy packages as supported-package backups only, validates complete recovery manifest v1 when present, and rejects malformed or contradictory full-recovery claims.

Files changed:
- `src/lib/server/completeRecoveryManifest.ts`
- `src/lib/server/backupConfig.ts`
- `src/lib/server/backupEngine.ts`
- `src/lib/server/backupValidator.ts`
- `src/lib/server/backupRestorePointInventory.ts`
- `src/lib/server/backupStoredPackageVerification.ts`
- `scripts/test-complete-recovery-manifest.mjs`
- `.softgen/tasks/task-253.md`

Checks run:
- `node scripts/test-complete-recovery-manifest.mjs` passed.
- `check_for_errors` passed with no CSS, lint, TypeScript, or server errors.

Limitations:
- Full-project recovery remains incomplete because schema, migrations, RLS policies, functions, triggers, Auth users, application source, deployment configuration, environment/secret recovery, integrations, webhooks, scheduled jobs, and destination restore writes remain unsupported or externally dependent.
- `full_project_recovery_complete` remains false unless every required component has verified evidence and a supported recovery method.

## Checklist
- [x] Inspect current backup manifest types, backup creation, validator, restore-point inventory, stored-package verification, preflight, and test setup
- [x] Define typed complete recovery manifest v1 statuses, components, evidence, blockers, and deterministic summary
- [x] Integrate complete recovery manifest generation into backup creation without weakening existing manifest fields or adding secret exports
- [x] Extend validation to recognize and validate complete recovery manifest v1 when present while preserving legacy package compatibility
- [x] Update restore-point and stored-package verification reporting to use the new manifest evidence when available
- [x] Add focused isolated tests for legacy packages, incomplete packages, malformed manifests, false full-recovery claims, status/evidence conflicts, and valid inventory-but-unverified recovery
- [x] Run static checks and relevant automated tests, then report files changed, rules, limitations, and safety confirmation

## Acceptance
New backups include a versioned complete recovery manifest that honestly inventories required recovery components without exposing secrets or claiming unsupported capabilities.
Validation rejects malformed or contradictory complete recovery manifests but treats older packages without the section as legacy/unverified.
`full_project_recovery_complete` remains false unless every required component has sufficient evidence and a supported recovery method.
Restore writes remain blocked and no database schema/data, project links, environment variables, deployments, Stamp Flow, or Quick Stamp files are changed.