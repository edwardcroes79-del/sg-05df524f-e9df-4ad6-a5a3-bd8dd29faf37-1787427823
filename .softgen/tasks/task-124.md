---
title: Backup history download button
status: done
priority: urgent
type: bug
tags: [backup, download, admin]
created_by: agent
created_at: 2026-10-05T21:00:49Z
position: 124
---

## Notes
Restored the missing Download Backup button in Super Admin → Backup History. The Actions column now shows View, Download, and Delete for completed backups. Clicking Download uses the existing Super Admin-protected `/api/admin/backups/[id]/download` endpoint, downloads the actual package associated with that backup record, does not generate a new backup, does not expose Storage credentials/private URLs, does not create mock files, and does not change backup creation, validation, restore, or deletion logic.

Files changed:
- `src/pages/admin/index.tsx`

Actual download verification:
- Existing completed backup tested: `01128063-0dac-4c32-8ad8-db3a9bed086a`
- Downloaded filename: `royalty-stamp-backup-2026-10-05T20-56-44-613Z-01128063-0dac-4c32-8ad8-db3a9bed086a.tar.gz`
- Created new backup: false
- Ends with `.part-0001`: false
- Size: `59,917,261` bytes (`57.14 MB`)
- Part count in Storage: 2, assembled by the authenticated download flow into one complete browser-facing `.tar.gz`
- SHA-256: `81813bf6785040d8e003ed8672667cb1fcfb22c12211b0e5ec5a2b7f9ddc3ce2`
- Gzip header: `1f8b`
- Validator result: valid
- Backup version: `2026-10-05.phase2`
- Validation errors: none
- Failed checks: 0
- Final project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect Backup History action rendering and current download handler
- [x] Inspect authenticated backup download API behavior for completed backup records
- [x] Add Download button to completed backup rows while preserving View and Delete buttons
- [x] Test download against an existing completed backup and verify actual filename/package
- [x] Run project validation
- [x] Report files changed and actual download test result

## Acceptance
Completed backups show View, Download, and Delete actions in Backup History.
Download retrieves the actual existing backup package and does not create a new backup.
Only Super Admin-authorized requests can download backup packages.