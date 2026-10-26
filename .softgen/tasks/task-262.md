---
title: Dry run upload activation
status: in_progress
priority: urgent
type: bug
tags: [disaster-recovery, dry-run, upload, safety]
created_by: agent
created_at: 2026-10-26T20:15:36Z
position: 262
---

## Notes
Investigate and fix the Disaster Recovery Center Preflight Dry Run upload button, which is currently greyed out and does not open the file picker. Restore writes must remain disabled. Work must be evidence-based and safe: no database, Storage, Auth, environment, project-link, deployment, Stamp Flow, Quick Stamp, SQL, migration, reset, destructive, restore, or project relink changes. Trace the full flow from `src/pages/admin/index.tsx` button to file input to `src/pages/api/admin/backups/restore-upload.ts`, preserving server-side Superadmin authorization and restore-write safeguards. Dry Run should allow archive-only validation without requiring an authorized restore destination unless a specific destination-only check genuinely requires it; such checks must be reported as not verified or blocked, not used to block archive validation.

## Checklist
- [ ] Inspect admin UI, restore-upload API, preflight engine, restore engine, archive validation utilities, and recent DR task reports
- [ ] Identify the exact current-code cause of the inactive Dry Run upload button
- [ ] Implement the smallest safe fix so Upload for Dry Run opens the file picker and supports archive-only validation
- [ ] Preserve the Restore Writes Disabled panel and all server-side restore-write safeguards
- [ ] Add focused tests for enabled Dry Run upload, file-picker wiring, file selection UI state, archive-only validation without destination authorization, invalid/oversized errors, server authorization, no restore-write invocation, and disabled restore upload
- [ ] Run focused tests and static checks, then report actual results and safety confirmation

## Acceptance
An authorized Superadmin can click Upload for Dry Run, select a supported archive, see filename and size, run read-only archive validation, and view PASS/WARNING/BLOCKED output.
Restore Upload remains disabled and does not become enabled through this task.
No database, Storage, Auth, environment, project-link, deployment, Stamp Flow, Quick Stamp, SQL, migration, reset, destructive, or restore operation occurs.