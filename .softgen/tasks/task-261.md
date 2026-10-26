---
title: Downloadable disaster recovery readiness report
status: in_progress
priority: high
type: feature
tags: [disaster-recovery, readiness-report, export, superadmin]
created_by: agent
created_at: 2026-10-26T20:02:49Z
position: 261
---

## Notes
Build a read-only Superadmin-only export feature in the Disaster Recovery Center that downloads a portable recovery readiness JSON report. The export must reuse the existing Schema Recovery Review architecture as the source of truth and must not perform restore operations, archive downloads, SQL execution, migrations, project switching, or write-enabling actions. The report must preserve blockers, unverified statuses, evidence limitations, verification references, provider requirements, and the warning that it is not a backup or proof of recoverability. PDF is optional only if already supported without substantial dependency/security risk.

Safety boundaries: no production database modification, no Supabase relink/switch, no SQL/migrations/restores/resets/destructive commands, no database/Storage/Auth/environment/credentials/deployment changes, no secret exposure, no automatic archive download/revalidation, no Stamp Flow or Quick Stamp changes, and no weakening restore-write safeguards. Protected Supabase project reference bmpiuvpnefobspimkyte remains protected.

## Checklist
- [x] Inspect Schema Recovery Review report/API, admin Disaster Recovery Center UI, DR manifest/planner modules, restore point inventory, authorization patterns, tests, and Tasks 254-259
- [x] Add a Superadmin-only read-only JSON export endpoint that reuses existing review-report data and adds a portable readiness export envelope, roadmap, provider requirements, and explicit non-recoverability disclaimer
- [x] Add an Export Recovery Readiness Report action to the Disaster Recovery Center that downloads a safe JSON filename and shows clear errors
- [x] Ensure the export excludes secrets, customer records, raw backup contents, restore controls, archive revalidation, and unsupported full-project recovery claims
- [x] Add focused tests for authorization, JSON structure/version, unresolved blockers, unverified statuses, no full recovery claims, secret/customer-data exclusion, API failure handling, no archive download/revalidation, no write side effects, and compatibility
- [ ] Run focused tests and static checks, then report actual results, files changed, limitations, and safety confirmation

## Acceptance
A Superadmin can download a JSON recovery readiness report from the Disaster Recovery Center.
The export reflects existing review evidence and blockers without implying arbitrary historical recovery readiness.
The endpoint does not trigger restore operations, backup archive downloads, database/Storage/Auth writes, or restore-write safeguards changes.