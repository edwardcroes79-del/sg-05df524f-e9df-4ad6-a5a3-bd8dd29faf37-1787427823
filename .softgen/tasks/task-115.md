---
title: Backup Dashboard
status: done
priority: urgent
type: feature
tags: [admin, backup, dashboard, ui]
created_by: agent
created_at: 2026-10-05T17:08:44Z
position: 115
---

## Notes
Implemented the Backup Dashboard inside the Super Admin interface based on the existing UI style.
Created a new "Backups" tab displaying:
- Automatic backup status (Daily at 03:00 UTC)
- Last successful backup (with timestamp and size)
- Last failed backup
- Manual "Backup Now" trigger button
- Backup History table containing date/time, status, package size, records, storage files, and actions.
Super Admins can view detailed manifest breakdowns (tables/buckets), download the multi-part packages, and securely delete old backups. Added the necessary `/api/admin/backups/[id]/delete.ts` server endpoint.
All data uses real database records from the previously implemented backup engine. Restore functionality is explicitly deferred.

## Checklist
- [x] Inspect Super Admin UI structure and API patterns
- [x] Add secure delete backup API endpoint
- [x] Add Backups tab and fetch backup job history
- [x] Create UI for triggering manual backups and viewing status
- [x] Create Backup History table with date, status, size, and counts
- [x] Implement view details, download, and delete actions
- [x] Run project validation

## Acceptance
Super Admin dashboard contains a Backups tab with summary cards and history table.
The UI displays real backup data including database size, storage size, and record counts.
Backups can be triggered manually, downloaded, and deleted.
Restore is not implemented.