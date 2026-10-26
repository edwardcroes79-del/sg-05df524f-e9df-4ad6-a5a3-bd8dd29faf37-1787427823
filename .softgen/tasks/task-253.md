---
title: Complete recovery manifest v1
status: in_progress
priority: urgent
type: feature
tags: [disaster-recovery, backups, manifest, recovery]
created_by: agent
created_at: 2026-10-26T18:16:15Z
position: 253
---

## Notes
Implement a versioned `complete_recovery_manifest` section for Royalty Stamp backups. The manifest must inventory all components required for complete historical project recovery, record available evidence and verification status honestly, and prevent supported backup packages from being misrepresented as complete project recovery points. This task must preserve existing backup format compatibility, not implement real restoration, not export secrets, not change database schema/data, not run SQL/migrations/restores, not enable restore writes, and not modify Stamp Flow or Quick Stamp. Tests must use isolated fixtures or mocks only.

## Checklist
- [x] Inspect current backup manifest types, backup creation, validator, restore-point inventory, stored-package verification, preflight, and test setup
- [x] Define typed complete recovery manifest v1 statuses, components, evidence, blockers, and deterministic summary
- [x] Integrate complete recovery manifest generation into backup creation without weakening existing manifest fields or adding secret exports
- [x] Extend validation to recognize and validate complete recovery manifest v1 when present while preserving legacy package compatibility
- [x] Update restore-point and stored-package verification reporting to use the new manifest evidence when available
- [x] Add focused isolated tests for legacy packages, incomplete packages, malformed manifests, false full-recovery claims, status/evidence conflicts, and valid inventory-but-unverified recovery
- [ ] Run static checks and relevant automated tests, then report files changed, rules, limitations, and safety confirmation

## Acceptance
New backups include a versioned complete recovery manifest that honestly inventories required recovery components without exposing secrets or claiming unsupported capabilities.
Validation rejects malformed or contradictory complete recovery manifests but treats older packages without the section as legacy/unverified.
`full_project_recovery_complete` remains false unless every required component has sufficient evidence and a supported recovery method.
Restore writes remain blocked and no database schema/data, project links, environment variables, deployments, Stamp Flow, or Quick Stamp files are changed.