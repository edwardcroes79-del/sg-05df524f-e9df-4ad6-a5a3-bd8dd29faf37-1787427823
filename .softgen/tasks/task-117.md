---
title: Safe backup restore
status: in_progress
priority: urgent
type: feature
tags: [backup, restore, admin, security]
created_by: agent
created_at: 2026-10-05T17:25:46Z
position: 117
---

## Notes
Implement production-safe restore using the validated backup system. Scope is restore only: Super Admin authorization, explicit confirmation, full validation before modifications, safety backup where technically possible, database record restore preserving IDs/relationships, Storage file restore to original paths, duplicate protection, dependency-aware restore order, secrets/auth credential exclusion, restore audit logging, and clear success/failure reporting. Do not modify unrelated functionality or weaken security. Controlled restore testing must happen before production restore is considered usable.

## Checklist
- [ ] Inspect backup package format, validator, backup engine, Super Admin APIs, and live schema dependencies
- [ ] Design dependency-aware restore order and safety constraints from actual tables/storage buckets
- [ ] Add server-side restore engine with validation-before-write, explicit confirmation, safety backup, database restore, storage restore, and reporting
- [ ] Add Super Admin restore API and Backup Dashboard restore UI without changing unrelated admin functionality
- [ ] Add restore logging and clear success/failure details
- [ ] Test controlled restore path safely before allowing production restore
- [ ] Run project validation

## Acceptance
Super Admin restore requires explicit confirmation and validates the backup before any production modification.
Restore preserves IDs/relationships and restores required Storage files while reporting failures clearly.
Authentication secrets are not restored and unrelated functionality/security is unchanged.