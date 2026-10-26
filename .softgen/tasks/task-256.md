---
title: Non-mutating database schema dependency planner
status: done
priority: high
type: feature
tags: [disaster-recovery, schema, planner, validation]
created_by: agent
created_at: 2026-10-26T18:53:53Z
position: 256
---

## Notes
Implemented a deterministic, non-mutating schema dependency planner using repository evidence only: migrations, generated database types, and Task 255 schema recovery inventory integration. The planner represents database objects as nodes and directed dependency edges, generates a reviewable dependency order where evidence allows, and reports cycles, unresolved dependencies, missing definitions, unsupported objects, inferred dependencies, and unknown dependencies. It does not execute SQL, connect to Supabase, query production, switch projects, enable restore writes, generate executable recovery SQL, or claim the live database matches repository definitions. Existing backup validation, legacy compatibility, and restore safeguards remain intact.

Files changed:
- `src/lib/server/schemaDependencyPlanner.ts`
- `src/lib/server/databaseSchemaRecoveryManifest.ts`
- `src/lib/server/backupRestorePointInventory.ts`
- `scripts/test-schema-dependency-planner.mjs`
- `.softgen/tasks/task-256.md`

Supported object categories:
- Required extensions and prerequisites
- Enums, domains, and custom types
- Schemas and tables
- Sequences and identity-related objects discoverable from migrations
- Primary keys, unique constraints, checks, and foreign keys discoverable from migrations
- Functions and procedures
- Views and materialized views
- Triggers
- Indexes
- RLS enablement, policies, and grants
- Unsupported and missing-definition objects surfaced as blocked evidence

Dependency evidence model:
- `explicit`: dependency is directly present in migration syntax, such as `REFERENCES`, `CREATE TRIGGER ... ON ... EXECUTE FUNCTION`, `CREATE INDEX ... ON`, or `CREATE POLICY ... ON`.
- `inferred`: dependency is conservatively inferred from function/procedure body relation references.
- `unknown`: dependency is known to exist but repository evidence does not define the provider/helper object, such as `auth.uid`.

Cycle and unresolved handling:
- Cycles are detected and reported instead of being force-ordered.
- Missing definitions are represented as blocked nodes.
- Unsupported object categories are reported instead of silently ignored.
- Planner readiness remains conservative: `inventory_only`, `partially_plannable`, `blocked`, or `ready_for_review`. `ready_for_review` does not authorize restore execution.

Validation behavior:
- Legacy manifests without `schema_dependency_plan` remain readable as inventory-only.
- Planner validation rejects malformed structures and contradictory claims of live database verification, executable SQL generation, or restore authorization.
- Schema recovery metadata is not upgraded to complete schema recovery merely because a dependency plan exists.

Checks run:
- `node scripts/test-schema-dependency-planner.mjs` passed.
- `check_for_errors` passed with no CSS, lint, TypeScript, or server errors.

Remaining blockers:
- No live database verification was performed.
- No destination database is authorized.
- No provider PITR/schema dump capability is verified.
- No executable schema reconstruction or restore procedure is implemented.
- Missing provider-managed objects, external helpers, and unsupported object types still require review.
- Restore writes remain blocked.

Recommended next task:
- Add a read-only schema recovery review report page/API that surfaces inventory and planner blockers for human approval before any destination recovery work is considered.

Safety confirmation:
- No SQL, migrations, database queries, database changes, Storage changes, restores, deployments, environment changes, credential changes, project-link changes, Stamp Flow changes, or Quick Stamp changes occurred.
- No Supabase project was switched, relinked, queried, or modified.
- Restore writes remain blocked.

## Checklist
- [x] Inspect Task 255 schema recovery inventory, backup manifest integration, validator, restore-point inventory, stored-package verification, migrations, generated types, prior task reports, and existing tests
- [x] Define a versioned schema dependency planner model with nodes, directed edges, evidence types, phases, readiness classification, cycles, missing definitions, unsupported objects, and traceability
- [x] Build deterministic repository-derived planning logic without database access or executable SQL generation
- [x] Integrate planner metadata with existing schema recovery metadata without upgrading schema capture or recovery claims
- [x] Extend validation to keep legacy manifests readable and reject malformed or contradictory planner claims
- [x] Add focused isolated tests for deterministic ordering, dependency chains, independent objects, foreign keys, functions/triggers, cycles, missing definitions, inferred/unknown dependencies, unsupported categories, source traceability, legacy compatibility, and no recovery claims
- [x] Run focused tests and static checks, then report files changed, supported dependency types, limitations, remaining blockers, and safety confirmation

## Acceptance
The planner produces a deterministic dependency plan from repository evidence only and does not connect to or mutate any database.
Unresolved dependencies, cycles, missing definitions, unsupported objects, inferred dependencies, and unknown dependencies are explicitly reported with traceability.
Planner output does not claim schema reconstruction, live schema capture, full-project recovery, or restore authorization.
Focused tests and static checks pass while restore writes remain blocked and no database, Storage, environment, project-link, deployment, Stamp Flow, or Quick Stamp changes occur.