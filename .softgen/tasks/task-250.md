---
title: Disaster recovery destination safety hardening
status: done
priority: urgent
type: feature
tags: [disaster-recovery, restore, destination-safety, super-admin]
created_by: agent
created_at: 2026-10-26T16:48:21Z
position: 250
---

## Notes
Continue from completed Tasks 248 and 249. Resolve the destination-validation architecture issue without rebuilding the Disaster Recovery system. Inspected how the server creates its Supabase client, where the actual project URL is configured, how destination reference is validated, and whether any separately authorized destination connection exists. No safe separate destination connection exists in the current code, so restore writes remain fail-closed. No restore requests, SQL, migrations, database operations, environment changes, clone investigation, deployments, or Stamp Flow/Quick Stamp changes were performed.

## Checklist
- [x] Inspect `backupRestorePreflight.ts`, `backupRestoreEngine.ts`, `restore-upload.ts`, and admin UI destination flow
- [x] Trace server Supabase client creation and actual project URL source
- [x] Determine whether a separately authorized destination connection exists
- [x] Harden server-side fail-closed destination identity verification without weakening environment matching
- [x] Update Disaster Recovery Center UI to accurately explain that restore writes remain blocked without a verified destination connection
- [x] Run safe local project checks only and report files changed, safeguards verified, and remaining blocker

## Acceptance
Server-side restore writes remain blocked unless the actual connected destination can be independently verified against the intended destination.
The UI does not imply that typed labels, project refs, checkboxes, or phrases authorize real restore writes.
No database, environment, deployment, Stamp Flow, or Quick Stamp changes are performed.