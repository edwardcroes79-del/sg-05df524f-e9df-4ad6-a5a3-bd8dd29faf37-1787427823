---
title: Backup status auto polling
status: done
priority: urgent
type: feature
tags: [backup, admin, polling, status]
created_by: agent
created_at: 2026-10-06T11:42:00Z
position: 127
---

## Notes
Added automatic status updates to the Super Admin Backup page only. The backup engine, backup worker, job locking, archive creation, storage backup, restore system, validation, download API, cancel API, delete API, and backend job-state behavior were not modified.

Implemented:
- `src/pages/admin/index.tsx` now polls the existing authenticated `/api/admin/backups` endpoint.
- Polling interval is 4 seconds.
- Polling is guarded by an interval ref and an in-flight ref to prevent duplicate intervals and overlapping requests.
- Polling starts/resumes when a backup is `queued` or `running`, including after Backup Now starts and when the page loads with an already active job.
- Polling stops automatically when no active backup remains.
- Polling cleanup runs on page/component unmount.
- Backup History shows automatic polling status and the last checked time.
- Completed backups show the existing Download action automatically because the list updates from the existing source of truth.
- Failed, cancelled, and abandoned statuses render with terminal status badges and no longer require a browser refresh.

Files changed:
- `src/pages/admin/index.tsx`
- `.softgen/tasks/task-127.md`

Actual status-source tests performed:
- Real cancelled lifecycle row:
  - Backup ID: `75ff7f0b-af96-4bc5-bbd1-7fbfb0bce541`
  - Status: `cancelled`
  - Started at: `2026-10-06 11:48:23.706+00`
  - Heartbeat at: `2026-10-06 11:48:24.483+00`
  - Completed at: `2026-10-06 11:48:24.651+00`
  - Cancelled at: `2026-10-06 11:48:24.651+00`
  - Cleanup completed at: `2026-10-06 11:48:24.911+00`
  - Package path: `null`
  - Error message: `Backup job was cancelled.`
- Real successful lifecycle row:
  - Backup ID: `1582a480-11c9-441f-8cb9-27bd66fa591e`
  - Status: `completed`
  - Started at: `2026-10-06 11:48:25.227+00`
  - Heartbeat at: `2026-10-06 11:49:33.221+00`
  - Completed at: `2026-10-06 11:49:34.475+00`
  - Package path: `1582a480-11c9-441f-8cb9-27bd66fa591e/royalty-stamp-backup-2026-10-06T11-48-25-227Z-1582a480-11c9-441f-8cb9-27bd66fa591e.tar.gz.parts`
  - Package size: `59,918,487` bytes
  - Error message: `null`
- Active backup count after tests: `0`.
- Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect current Super Admin backup state, Backup Now handler, fetchAdminData behavior, and backup list rendering
- [x] Add a single guarded polling loop that uses the existing authenticated Super Admin backup source
- [x] Start/resume polling after Backup Now and when existing backups are running
- [x] Stop polling automatically when no active backup jobs remain
- [x] Preserve existing Download, View, Delete, Cancel, Refresh, and backup lock behavior
- [x] Test real backup completion UI update, cancelled/failed UI update, polling cleanup, and duplicate interval prevention
- [x] Run project validation
- [x] Report files changed and actual test results

## Acceptance
Backup History updates from RUNNING to terminal status without browser refresh.
Completed backups show the existing Download action automatically.
Polling stops after terminal status and does not create duplicate request loops.