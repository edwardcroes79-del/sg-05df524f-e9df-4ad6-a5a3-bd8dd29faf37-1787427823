---
title: Backup status auto polling
status: in_progress
priority: urgent
type: feature
tags: [backup, admin, polling, status]
created_by: agent
created_at: 2026-10-06T11:38:00Z
position: 127
---

## Notes
Add automatic status updates to the Super Admin Backup page only. Do not modify, rewrite, or redesign the backup engine, backup worker, job locking, archive creation, storage backup, restore system, or backend job-state behavior. After Backup Now starts, the page should poll the existing authenticated Super Admin backup list/status source every 3–5 seconds, update RUNNING/COMPLETED/FAILED/CANCELLED/ABANDONED status automatically, show Download as soon as a backup completes, show failed/cancelled errors immediately, stop polling at terminal states, avoid duplicate intervals, clean up on unmount, resume polling if the page opens while a backup is already running, and keep any manual refresh fallback.

Implemented:
- Added UI-only polling in `src/pages/admin/index.tsx` against the existing authenticated `/api/admin/backups` endpoint.
- Polling interval is 4 seconds.
- Polling is guarded by an interval ref and an in-flight ref to prevent duplicate intervals and overlapping requests.
- Polling starts/resumes when a backup is running or queued, and after Backup Now starts.
- Polling stops automatically when no active backup remains.
- Polling cleanup runs on page/component unmount.
- Backup History shows automatic polling status and updates the existing completed Download action as soon as the list reports `completed`.
- No backup engine, worker, locking, archive, storage, restore, validation, download API, cancel API, or delete API logic was changed.

## Checklist
- [x] Inspect current Super Admin backup state, Backup Now handler, fetchAdminData behavior, and backup list rendering
- [x] Add a single guarded polling loop that uses the existing authenticated Super Admin backup source
- [x] Start/resume polling after Backup Now and when existing backups are running
- [x] Stop polling automatically when no active backup jobs remain
- [x] Preserve existing Download, View, Delete, Cancel, Refresh, and backup lock behavior
- [ ] Test real backup completion UI update, cancelled/failed UI update, polling cleanup, and duplicate interval prevention
- [ ] Run project validation
- [ ] Report files changed and actual test results

## Acceptance
Backup History updates from RUNNING to terminal status without browser refresh.
Completed backups show the existing Download action automatically.
Polling stops after terminal status and does not create duplicate request loops.