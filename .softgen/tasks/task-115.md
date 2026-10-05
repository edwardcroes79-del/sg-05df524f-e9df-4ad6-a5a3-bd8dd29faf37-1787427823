---
title: Backup Dashboard
status: in_progress
priority: urgent
type: feature
tags: [admin, backup, dashboard, ui]
created_by: agent
created_at: 2026-10-05T17:07:00Z
position: 115
---

## Notes
Create a Backup & Restore section inside Super Admin. Must use existing Super Admin authentication and UI style. Show Backup Now button, automatic backup status, last successful/failed backup, and backup history (date/time, DB size, Storage size, record count, file count, status). Allow download, delete, and view details. Real data only, no mock records. Do not implement restore.

## Checklist
- [ ] Inspect `src/pages/admin/index.tsx` to integrate a new "Backups" tab
- [ ] Implement API endpoint to delete backups (`/api/admin/backups/[id]/delete.ts`)
- [ ] Add Backup UI components (status cards, history table, details dialog)
- [ ] Wire up "Backup Now", download, delete, and fetch history
- [ ] Validate UI layout and existing Super Admin functionality
- [ ] Run project validation

## Acceptance
Super Admin has a functional Backups tab.
Real backup data is displayed with correct sizes and counts.
Backups can be triggered manually, downloaded, and deleted.
Restore is not implemented.