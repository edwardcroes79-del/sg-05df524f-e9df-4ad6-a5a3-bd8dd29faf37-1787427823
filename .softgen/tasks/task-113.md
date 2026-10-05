---
title: Backup system phase 2 engine
status: in_progress
priority: urgent
type: feature
tags: [backup, supabase, security, admin]
created_by: agent
created_at: 2026-10-05T16:20:21Z
position: 113
---

## Notes
Implement Phase 2 backup engine only, based on the completed Phase 1 audit. Built server-side backup creation for real production Supabase data and required Storage buckets. Includes database JSONL exports, Storage files, manifest, version, timestamp, counts, checksums, compression, secure Super Admin-only triggering/access, private backup storage, and success/failure logging. Does not implement restore, dashboard UI, or automatic scheduling. Does not modify existing production app data except backup metadata/log records and backup artifact storage required for this phase. Does not weaken RLS/security or expose service-role credentials to the browser.

Real smoke backup verification created backup job `e496b323-50f9-4244-958d-6bbb3d865efb` in private bucket `system-backups` at `e496b323-50f9-4244-958d-6bbb3d865efb/royalty-stamp-backup-2026-10-05T16-53-55-147Z-e496b323-50f9-4244-958d-6bbb3d865efb.tar.gz.parts`. Package size: 59,334,809 bytes. Package SHA-256: `7a087f2f0e5e0a7ad70480ba339e0975b67a4998adb27daf0fafb28a47e6ebc9`. Package was split into 2 checksum-tracked parts due Storage object limits. Manifest verified with 25 tables, 2 buckets, manifest checksum present, row counts and object counts from real production structure.

## Checklist
- [x] Inspect existing privileged admin API patterns, dependencies, schema, and backup audit report
- [x] Add secure server-side backup engine utilities for table export, Storage export, manifest/checksums, compression, and logging
- [x] Add Super Admin-only backup trigger API without restore, dashboard, or scheduling
- [x] Add Super Admin-only backup listing/download metadata API if required for secure access
- [x] Ensure private backup bucket/table setup is safe and idempotent
- [x] Verify package format, manifest, table counts, Storage counts, and checksums against real structure where possible
- [ ] Run project validation

## Acceptance
Super Admin can trigger a server-side backup package without exposing service-role credentials.
Backup package includes audited tables, audited Storage buckets, manifest, counts, checksums, and compressed archive format.
No restore, dashboard, scheduling, unrelated data changes, RLS weakening, or mock production data is introduced.