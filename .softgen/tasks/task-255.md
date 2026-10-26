---
title: Database schema recovery inventory
status: done
priority: urgent
type: feature
tags: [disaster-recovery, backups, schema, validation]
created_by: agent
created_at: 2026-10-26T18:41:54Z
position: 255
---

## Notes
Implemented a versioned `database_schema_recovery` inventory for Royalty Stamp backup manifests without connecting to, querying, switching, or modifying any Supabase project. The inventory is explicitly repository-derived, using migration files and generated Supabase TypeScript types as evidence. It records all required schema recovery categories, deterministic repository fingerprints, migration evidence, discovered SQL-object pattern counts, future recovery sequence guidance, blockers, and limitations. It does not claim live schema capture, complete schema recovery support, or an implemented/tested schema reconstruction procedure. Validation now keeps legacy packages readable and rejects malformed or contradictory claims such as live schema capture, complete schema recovery, or tested recovery procedures. Restore writes remain blocked.

Files changed:
- `src/lib/server/databaseSchemaRecoveryManifest.ts`
- `src/lib/server/backupConfig.ts`
- `src/lib/server/backupEngine.ts`
- `src/lib/server/backupValidator.ts`
- `src/lib/server/backupRestorePointInventory.ts`
- `src/lib/server/backupStoredPackageVerification.ts`
- `scripts/test-database-schema-recovery-manifest.mjs`
- `.softgen/tasks/task-255.md`

Schema categories inventoried:
- Schemas and tables
- Columns, data types, nullability, and defaults
- Primary keys and unique constraints
- Foreign keys and referential actions
- Check constraints and exclusion constraints
- Indexes
- Sequences and identity-generation configuration
- Views and materialized views
- Database functions and procedures
- Triggers and trigger dependencies
- Row-Level Security enabled/forced state and policies
- Table, schema, function, and sequence privileges and grants
- Extensions and required database features
- Enums, domains, and custom types
- Migration history and expected schema version
- Other database objects or dependencies discovered in the repository

What is actually captured versus inventoried:
- Current backup packages still capture configured table-data exports and configured Storage object exports.
- Database schema recovery metadata is repository-derived inventory only.
- Live database schema state was not captured, queried, or verified.
- Table-data exports are not treated as complete schema backups.
- Complete schema recovery remains unsupported because no tested schema reconstruction procedure, destination compatibility check, or live schema verification exists.

Checks run:
- `node scripts/test-database-schema-recovery-manifest.mjs` passed.
- `check_for_errors` passed with no CSS, lint, TypeScript, or server errors.

Legacy compatibility:
- Existing manifests without `database_schema_recovery` remain readable as legacy packages without schema recovery evidence.
- New validation rejects unsupported claims while preserving existing package checksum, required-table, required-bucket, complete recovery, and restore-point consistency validation behavior.

Remaining blockers:
- No live database schema snapshot or catalog export is captured.
- No provider-supported schema dump/PITR capability is verified.
- No independently authorized recovery destination exists.
- No tested schema reconstruction or dependency-aware restore procedure exists.
- Auth users, identities, source/deployment recovery, environment secret recovery, and operational integrations remain outside implemented backup recovery.
- Restore writes remain blocked.

Recommended next task:
Implement a non-mutating repository-derived schema dependency planner that parses existing migration evidence into a safe ordered plan for extensions, custom types, tables, constraints, functions, triggers, RLS policies, indexes, grants, and validation steps. This should remain design/planning metadata only until a destination is independently authorized.

Safety confirmation:
No SQL, migrations, schema changes, database data changes, Storage changes, restores, project-link changes, environment-variable changes, credential changes, deployments, Stamp Flow changes, or Quick Stamp changes occurred. The known production project reference remains protected and was not queried, modified, relinked, or used as a recovery destination.

## Checklist
- [x] Inspect current backup engine, backup config, validator, complete recovery manifest, restore-point consistency manifest, restore-point inventory, stored-package verification, schema artifacts, tests, and Tasks 250-254
- [x] Audit current schema-recovery coverage and identify captured, inventoried, unsupported, unverified, and blocked categories
- [x] Define a versioned database schema recovery inventory model with repository-derived evidence and explicit live-schema limitations
- [x] Integrate schema recovery inventory metadata into newly generated backup manifests without exporting secrets or changing restore behavior
- [x] Extend validation to preserve legacy compatibility and reject malformed or contradictory complete-schema-recovery claims
- [x] Add focused isolated tests covering required schema categories, missing definitions, repository-vs-live evidence, legacy packages, deterministic fingerprints, and false recovery claims
- [x] Run focused tests and static checks, then report files changed, limitations, provider prerequisites, and safety confirmation

## Acceptance
New backups include database schema recovery inventory metadata that distinguishes repository-derived evidence from live database evidence.
Validation prevents unsupported complete-schema-recovery claims and keeps legacy backup packages readable.
Focused tests and static checks pass without connecting to or modifying production.
Restore writes remain blocked and no SQL, migrations, database changes, Storage changes, environment changes, project-link changes, deployments, Stamp Flow, or Quick Stamp changes occur.