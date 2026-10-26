---
title: Schema recovery blocker classification
status: done
priority: urgent
type: bug
tags: [disaster-recovery, schema-recovery, blockers, audit]
created_by: agent
created_at: 2026-10-26T19:37:14Z
position: 259
---

## Notes
Task 259 classified Schema Recovery Review blockers using repository evidence only. Supabase-managed dependencies are identified without attempting to recreate them, parser artifacts are separated from real database objects when source evidence supports that classification, and genuine unresolved schema recovery blockers remain visible. The blocker report now includes stable blocker IDs, object category, object name, severity, classification, evidence source, reason, repository-resolvability, required capability or authorization, and recommended next action.

Before/after classification for named displayed entries:
- auth.uid: before unresolved/missing-looking reference; after provider_managed_dependency, function, Supabase Auth helper required in an independently authorized destination.
- auth.users: before unresolved/missing-looking table; after provider_managed_dependency, schema_table, Supabase Auth table outside app migrations.
- authenticated: before unresolved role-like reference; after provider_managed_dependency, database_role, Supabase-managed role.
- anon: before unresolved role-like reference; after provider_managed_dependency, database_role, Supabase-managed role.
- business_users: before could appear as missing when referenced without schema qualification; after repository-defined public-schema alias resolution prevents false missing_definition when public.business_users exists.
- assigned__locations: after parser_artifact when encountered, due invalid double-underscore parser-shaped reference requiring parser refinement rather than schema recreation.
- subscription c762127ddb14: after unsupported_object, because CREATE SUBSCRIPTION is inventoried as unsupported by the non-mutating planner and requires explicit future support/provider review.
- 1: after parser filtering/parser_artifact handling; numeric SQL expression references are not treated as recoverable schema objects.
- anon.: after parser filtering/parser_artifact handling; malformed schema-qualified parser output is not treated as a real database object.

Files changed:
- src/lib/server/schemaDependencyPlanner.ts
- src/lib/server/schemaRecoveryReviewReport.ts
- src/pages/admin/index.tsx
- scripts/test-schema-recovery-blocker-classification.mjs
- .softgen/tasks/task-259.md

Actual validation results:
- node scripts/test-schema-recovery-blocker-classification.mjs: passed
- check_for_errors: passed with no CSS, linting, type checking, or server errors found
- Targeted eslint/tsc validation was also attempted; platform static validation later passed through check_for_errors.

Remaining prerequisites:
Full-project recovery still requires an authorized destination, provider-managed Supabase Auth/role compatibility verification, live schema verification or provider export, support/review for unsupported database object types, verified recovery procedures, and restore authorization that remains intentionally blocked.

Safety confirmation:
No production database, Storage, Auth, schema, environment, project-link, deployment, Stamp Flow, or Quick Stamp changes occurred. No SQL, migrations, restores, resets, destructive commands, Supabase project switching, or project relinking occurred. Restore writes remain blocked.

Recommended next task:
Add a non-mutating recovery readiness export that lets a Superadmin download the classified blocker report as JSON/PDF evidence for provider review before any authorized recovery destination is considered.

## Checklist
- [x] Inspect database schema recovery inventory, dependency planner, schema recovery review report/API, admin review UI, migrations/generated types, and Tasks 255-258
- [x] Trace each displayed blocker to its source and classify whether it is missing definition, live-state unverified, unsupported object, provider-managed dependency, parser artifact, recovery-procedure missing, repository-only evidence, or unknown
- [x] Implement narrow code changes that improve blocker classification, stable IDs, traceability, severity, evidence source, recommended action, and reporting accuracy
- [x] Preserve genuine unresolved blockers and avoid unsupported full-project recovery claims
- [x] Add focused tests for Supabase-managed references, genuine missing definitions, parser artifacts, unknown references, stable blocker evidence, legacy compatibility, and no database mutation requirement
- [x] Run focused tests and static checks, then report before/after classifications, remaining prerequisites, and safety confirmation

## Acceptance
The Recovery Blockers section shows accurate, traceable classifications for the named displayed entries.
Repository-supported parser artifacts or provider-managed dependencies are identified without suppressing genuine blockers.
Restore writes remain blocked and no database, Storage, Auth, environment, project-link, deployment, Stamp Flow, or Quick Stamp changes occur.