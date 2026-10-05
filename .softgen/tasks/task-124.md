---
title: Backup history download button
status: in_progress
priority: urgent
type: bug
tags: [backup, download, admin]
created_by: agent
created_at: 2026-10-05T21:00:49Z
position: 124
---

## Notes
Restore the missing Download Backup button in Super Admin → Backup History. The Actions column currently shows View and Delete, but no Download button. Add the Download action back for completed backups only. Clicking Download must download the actual package associated with that backup record through the existing Super Admin-protected download endpoint, without generating a new backup, exposing Storage credentials/private URLs, creating mock files, or changing backup creation, validation, restore, or deletion logic. Preserve existing View and Delete actions.

## Checklist
- [ ] Inspect Backup History action rendering and current download handler
- [ ] Inspect authenticated backup download API behavior for completed backup records
- [ ] Add Download button to completed backup rows while preserving View and Delete buttons
- [ ] Test download against an existing completed backup and verify actual filename/package
- [ ] Run project validation
- [ ] Report files changed and actual download test result

## Acceptance
Completed backups show View, Download, and Delete actions in Backup History.
Download retrieves the actual existing backup package and does not create a new backup.
Only Super Admin-authorized requests can download backup packages.