---
title: Database schema recovery inventory
status: in_progress
priority: urgent
type: feature
tags: [disaster-recovery, backups, schema, validation]
created_by: agent
created_at: 2026-10-26T18:41:54Z
position: 255
---

## Notes
Task 255 establishes database schema recovery evidence for Royalty Stamp without connecting to, querying, switching, or modifying any Supabase project. The implementation must audit current backup coverage, add a versioned machine-readable schema recovery inventory to the existing recovery-manifest architecture, distinguish repository-derived evidence from live database evidence, validate unsupported complete-schema-recovery claims, add focused isolated tests, and preserve all restore-write safeguards. The known production project reference `bmpiuvpnefobspimkyte` is strictly protected and must not be queried, modified, relinked, or used as a recovery destination. No SQL, migrations, schema changes, restores, deployments, environment/project-link changes, Stamp Flow, or Quick Stamp changes are allowed.

## Checklist
- [ ] Inspect current backup engine, backup config, validator, complete recovery manifest, restore-point consistency manifest, restore-point inventory, stored-package verification, schema artifacts, tests, and Tasks 250-254
- [ ] Audit current schema-recovery coverage and identify captured, inventoried, unsupported, unverified, and blocked categories
- [ ] Define a versioned database schema recovery inventory model with repository-derived evidence and explicit live-schema limitations
- [ ] Integrate schema recovery inventory metadata into newly generated backup manifests without exporting secrets or changing restore behavior
- [ ] Extend validation to preserve legacy compatibility and reject malformed or contradictory complete-schema-recovery claims
- [ ] Add focused isolated tests covering required schema categories, missing definitions, repository-vs-live evidence, legacy packages, deterministic fingerprints, and false recovery claims
- [ ] Run focused tests and static checks, then report files changed, limitations, provider prerequisites, and safety confirmation

## Acceptance
New backups include database schema recovery inventory metadata that distinguishes repository-derived evidence from live database evidence.
Validation prevents unsupported complete-schema-recovery claims and keeps legacy backup packages readable.
Focused tests and static checks pass without connecting to or modifying production.
Restore writes remain blocked and no SQL, migrations, database changes, Storage changes, environment changes, project-link changes, deployments, Stamp Flow, or Quick Stamp changes occur.