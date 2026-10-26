---
title: Persisted backup verification evidence
status: in_progress
priority: high
type: feature
tags: [disaster-recovery, backups, verification, evidence]
created_by: agent
created_at: 2026-10-26T19:14:55Z
position: 258
---

## Notes
Implement a reliable way to record and retrieve evidence from stored backup package verification so the Disaster Recovery Center and Schema Recovery Review Center can show previous verification outcomes without automatically downloading or revalidating archives. Safety boundaries: do not switch or relink Supabase projects, do not execute SQL/migrations/restores/resets/destructive commands, do not enable restore writes, do not change environment variables/secrets/project references/deployments, do not modify Stamp Flow or Quick Stamp, and do not automatically download stored archives during review-page loading. The known production project reference is protected. If persistence requires a new database table, migration, or unauthorized write path, stop at design/reporting and do not apply it.

## Checklist
- [x] Inspect stored package verification, validate-stored API, schema recovery review report/API, backup validator, consistency manifests, backup metadata, task reports, and authorization patterns
- [x] Determine whether an authorized verification evidence persistence mechanism already exists
- [x] Define a versioned verification evidence record that separates package integrity from historical consistency and full-project recovery
- [x] Integrate previous evidence retrieval into the review report only if persistence is already authorized; otherwise implement a read-only evidence contract and blocked persistence design
- [x] Preserve explicit Superadmin authorization and avoid automatic archive downloads or restore/write helper calls in review endpoints
- [x] Add focused tests for evidence statuses, no false consistency/full-recovery claims, no archive revalidation from review, authorization, secret exclusion, legacy compatibility, and restore-safeguard preservation
- [ ] Run focused tests and static checks, then report files changed, persistence status, limitations, and safety confirmation

## Acceptance
The review center can represent stored-package verification evidence as `verified`, `failed`, `incomplete`, or `not_verified` without conflating it with historical consistency or full-project recovery.
No persistence is claimed unless an authorized persistence mechanism actually exists and is used.
The Schema Recovery Review API does not download or revalidate stored archives automatically.
Restore writes remain blocked and no database, Storage, environment, project-link, deployment, Stamp Flow, or Quick Stamp changes occur.