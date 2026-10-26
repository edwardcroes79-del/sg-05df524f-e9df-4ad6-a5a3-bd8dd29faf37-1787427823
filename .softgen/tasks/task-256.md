---
title: Non-mutating database schema dependency planner
status: in_progress
priority: high
type: feature
tags: [disaster-recovery, schema, planner, validation]
created_by: agent
created_at: 2026-10-26T18:53:53Z
position: 256
---

## Notes
Implement a deterministic, non-mutating schema dependency planner using repository evidence only: migrations, generated database types, and Task 255 schema recovery inventory. The planner must represent database objects as nodes and directed dependency edges, generate a reviewable dependency order where evidence allows, and report cycles, unresolved dependencies, missing definitions, unsupported objects, inferred dependencies, and unknown dependencies. It must not execute SQL, connect to Supabase, query production, switch projects, enable restore writes, generate executable recovery SQL, or claim the live database matches repository definitions. Existing backup validation, legacy compatibility, and restore safeguards must remain intact.

## Checklist
- [x] Inspect Task 255 schema recovery inventory, backup manifest integration, validator, restore-point inventory, stored-package verification, migrations, generated types, prior task reports, and existing tests
- [x] Define a versioned schema dependency planner model with nodes, directed edges, evidence types, phases, readiness classification, cycles, missing definitions, unsupported objects, and traceability
- [x] Build deterministic repository-derived planning logic without database access or executable SQL generation
- [x] Integrate planner metadata with existing schema recovery metadata without upgrading schema capture or recovery claims
- [x] Extend validation to keep legacy manifests readable and reject malformed or contradictory planner claims
- [x] Add focused isolated tests for deterministic ordering, dependency chains, independent objects, foreign keys, functions/triggers, cycles, missing definitions, inferred/unknown dependencies, unsupported categories, source traceability, legacy compatibility, and no recovery claims
- [ ] Run focused tests and static checks, then report files changed, supported dependency types, limitations, remaining blockers, and safety confirmation

## Acceptance
The planner produces a deterministic dependency plan from repository evidence only and does not connect to or mutate any database.
Unresolved dependencies, cycles, missing definitions, unsupported objects, inferred dependencies, and unknown dependencies are explicitly reported with traceability.
Planner output does not claim schema reconstruction, live schema capture, full-project recovery, or restore authorization.
Focused tests and static checks pass while restore writes remain blocked and no database, Storage, environment, project-link, deployment, Stamp Flow, or Quick Stamp changes occur.