---
title: Disaster Recovery Center UI Implementation
status: in_progress
priority: urgent
type: feature
tags: [disaster-recovery, backups, restore, admin-ui]
created_by: agent
created_at: 2026-10-26T16:40:00Z
position: 249
---

## Notes
Implement the Disaster Recovery Center UI and connect it to the existing backend preflight logic. Ensure the UI includes backup archive selection, explicit destination identification (Label, Project Ref, Confirmation), and a comprehensive dry-run preflight report display (PASS, WARNING, BLOCKED, NOT VERIFIED). Do NOT execute a real restore, overwrite database records, or bypass server-side validation. Maintain a clean, professional, beginner-friendly interface.

## Checklist
- [ ] Locate existing Backup/Restore UI components (likely in `src/pages/admin/index.tsx` or `src/components/admin/`).
- [ ] Add Archive Selection/Upload UI.
- [ ] Add Explicit Destination Identification fields (Label, Project Ref, Confirmation Checkbox).
- [ ] Connect UI to `api/admin/backups/restore-upload` with `mode=dry_run`.
- [ ] Build Dry-Run Preflight Report UI mapping to `BackupRestoreReport` & `BackupRestorePreflightReport` types.
- [ ] Build Recovery Readiness Summary.
- [ ] Verify validation errors and UI state handling.
- [ ] Run project checks (lint, typescript) and report exact files changed.