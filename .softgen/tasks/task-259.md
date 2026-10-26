---
title: Schema recovery blocker classification
status: in_progress
priority: urgent
type: bug
tags: [disaster-recovery, schema-recovery, blockers, audit]
created_by: agent
created_at: 2026-10-26T19:37:14Z
position: 259
---

## Notes
Task 259 classifies and resolves Schema Recovery Review blockers using repository evidence only. The goal is accurate, actionable, traceable blockers, not hiding unresolved risks. Mandatory restrictions: no production database connection/query/mutation, no Supabase relink/switch, no SQL/migrations/restores/resets/destructive commands, no production data/Storage/Auth/schema changes, no environment/credential/deployment changes, no Stamp Flow or Quick Stamp changes, and no restore-write enablement or bypass. Known production project reference bmpiuvpnefobspimkyte remains protected. Specific displayed entries to classify: auth.uid, auth.users, authenticated, anon, business_users, assigned__locations, subscription c762127ddb14, 1, and anon. Classifications must distinguish missing_definition, repository_evidence_only, provider_managed_dependency, live_state_unverified, unsupported_object, recovery_procedure_missing, parser_artifact, and unknown.

## Checklist
- [x] Inspect database schema recovery inventory, dependency planner, schema recovery review report/API, admin review UI, migrations/generated types, and Tasks 255-258
- [x] Trace each displayed blocker to its source and classify whether it is missing definition, live-state unverified, unsupported object, provider-managed dependency, parser artifact, recovery-procedure missing, repository-only evidence, or unknown
- [x] Implement narrow code changes that improve blocker classification, stable IDs, traceability, severity, evidence source, recommended action, and reporting accuracy
- [x] Preserve genuine unresolved blockers and avoid unsupported full-project recovery claims
- [x] Add focused tests for Supabase-managed references, genuine missing definitions, parser artifacts, unknown references, stable blocker evidence, legacy compatibility, and no database mutation requirement
- [ ] Run focused tests and static checks, then report before/after classifications, remaining prerequisites, and safety confirmation

## Acceptance
The Recovery Blockers section shows accurate, traceable classifications for the named displayed entries.
Repository-supported parser artifacts or provider-managed dependencies are identified without suppressing genuine blockers.
Restore writes remain blocked and no database, Storage, Auth, environment, project-link, deployment, Stamp Flow, or Quick Stamp changes occur.