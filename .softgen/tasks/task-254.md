---
title: Restore-point consistency manifest v1
status: in_progress
priority: high
type: feature
tags: [disaster-recovery, backups, consistency, manifest]
created_by: agent
created_at: 2026-10-26T18:30:44Z
position: 254
---

## Notes
Implement a versioned `restore_point_consistency` section in Royalty Stamp backup manifests. This must record actual phase timings, the declared consistency model, evidence, validation statuses, and blockers. Current backups are sequential best-effort exports, not transactionally consistent database snapshots or full-project recovery points. Preserve existing backup compatibility and restore-write safeguards. Do not execute SQL, migrations, restores, project switching, environment changes, deployments, Stamp Flow changes, or Quick Stamp changes.

## Checklist
- [x] Inspect current backup manifest, backup creation, complete recovery manifest, validator, stored package verification, and restore-point inventory code
- [x] Define typed restore-point consistency manifest v1 model and validation rules
- [x] Integrate actual backup phase timings into newly generated backup manifests without estimating unavailable values
- [x] Extend validation to reject malformed or contradictory consistency claims while keeping legacy packages compatible
- [x] Surface consistency evidence in stored package verification and restore-point inventory where appropriate
- [x] Add focused isolated tests for best-effort classification, false consistency claims, legacy compatibility, and incomplete backups
- [ ] Run tests and static checks, then report files changed, validation rules, remaining blockers, and safety confirmation

## Acceptance
New backups include a versioned restore-point consistency manifest that truthfully classifies current exports as `best_effort_sequential_export`.
Validation prevents database-consistent, cross-component-consistent, or full-project-recoverable claims without required evidence.
Legacy backup packages remain readable under existing compatibility rules.
Restore writes remain blocked and no database, Storage, environment, project-link, deployment, Stamp Flow, or Quick Stamp changes occur.