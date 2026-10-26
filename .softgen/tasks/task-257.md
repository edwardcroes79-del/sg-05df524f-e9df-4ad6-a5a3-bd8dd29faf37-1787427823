---
title: Schema recovery review center
status: done
priority: high
type: feature
tags: [disaster-recovery, schema, review, superadmin]
created_by: agent
created_at: 2026-10-26T19:05:30Z
position: 257
---

## Notes
Built a read-only Disaster Recovery review page and authenticated Superadmin-only API that consolidate existing schema recovery inventory, schema dependency planner, backup validation status, restore-point consistency evidence, complete recovery manifest status, and blockers. The endpoint and UI report evidence only; they do not execute SQL, switch Supabase projects, download packages automatically, enable restore writes, expose secrets, deploy, or modify Stamp Flow or Quick Stamp. The new API uses the existing `requireSuperAdmin(req)` server-side authorization convention before using the service client. The report builder intentionally excludes stored package verification downloads and restore engine helpers.

## Checklist
- [x] Inspect existing DR manifest/planner modules, backup validation modules, Superadmin dashboard authorization patterns, tests, and Tasks 250-256
- [x] Implement a read-only Superadmin-only API that aggregates repository-derived schema recovery evidence, planner readiness, consistency status, missing evidence, blockers, and warnings without write side effects
- [x] Add a Schema Recovery Review section/page to the existing Disaster Recovery Center with clear non-green states for unverified or blocked components
- [x] Validate API output shape, authorization rejection paths, partial evidence handling, and no full-project recovery claims without evidence
- [x] Add focused tests for Superadmin authorization, read-only behavior, aggregation, blockers, missing evidence, cycles, and restore-safeguard preservation
- [x] Run focused tests and static checks, then report files changed, safety guarantees, limitations, and remaining blockers

## Acceptance
The Superadmin can view schema recovery inventory, dependency planner readiness, blockers, missing definitions, unsupported objects, consistency limits, and recovery gaps in a read-only review interface.
The API rejects unauthenticated or unauthorized users server-side and performs no SQL, restore, Storage, package-download, or mutation side effects.
The review center does not claim full historical or full-project recovery without supporting evidence, and restore writes remain blocked.
Focused test `node scripts/test-schema-recovery-review-report.mjs` passed, and `check_for_errors` passed with no CSS, lint, TypeScript, or server errors.
No SQL, migrations, restores, deployments, environment changes, project-link changes, Stamp Flow changes, or Quick Stamp changes occurred.