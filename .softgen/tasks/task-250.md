---
title: Disaster recovery destination safety hardening
status: in_progress
priority: urgent
type: feature
tags: [disaster-recovery, restore, destination-safety, super-admin]
created_by: agent
created_at: 2026-10-26T16:48:21Z
position: 250
---

## Notes
Continue from completed Tasks 248 and 249. Resolve the destination-validation architecture issue without rebuilding the Disaster Recovery system. Inspect how the server creates its Supabase client, where the actual project URL is configured, how destination reference is validated, and whether any separately authorized destination connection exists. If no safe destination connection exists, keep restore writes blocked and implement safe application-layer checks/UI that explain the limitation. Do not run restore requests, SQL, migrations, database operations, environment changes, clone investigation, deployments, or Stamp Flow/Quick Stamp changes.

## Checklist
- [ ] Inspect `backupRestorePreflight.ts`, `backupRestoreEngine.ts`, `restore-upload.ts`, and admin UI destination flow
- [ ] Trace server Supabase client creation and actual project URL source
- [ ] Determine whether a separately authorized destination connection exists
- [ ] Harden server-side fail-closed destination identity verification without weakening environment matching
- [ ] Update Disaster Recovery Center UI to accurately explain that restore writes remain blocked without a verified destination connection
- [ ] Run safe local project checks only and report files changed, safeguards verified, and remaining blocker

## Acceptance
Server-side restore writes remain blocked unless the actual connected destination can be independently verified against the intended destination.
The UI does not imply that typed labels, project refs, checkboxes, or phrases authorize real restore writes.
No database, environment, deployment, Stamp Flow, or Quick Stamp changes are performed.