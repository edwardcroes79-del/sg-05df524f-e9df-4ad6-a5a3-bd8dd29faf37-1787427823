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
Implement Phase 2 backup engine only, based on the completed Phase 1 audit. Build server-side backup creation for real production Supabase data and required Storage buckets. Include database JSONL exports, Storage files, manifest, version, timestamp, counts, checksums, compression, secure Super Admin-only triggering/access, private backup storage, and success/failure logging. Do not implement restore, dashboard UI, or automatic scheduling. Do not modify existing production app data except backup metadata/log records and backup artifact storage required for this phase. Do not weaken RLS/security or expose service-role credentials to the browser.

## Checklist
- [x] Inspect existing privileged admin API patterns, dependencies, schema, and backup audit report
- [x] Add secure server-side backup engine utilities for table export, Storage export, manifest/checksums, compression, and logging
- [x] Add Super Admin-only backup trigger API without restore, dashboard, or scheduling
- [ ] Add Super Admin-only backup listing/download metadata API if required for secure access
- [x] Ensure private backup bucket/table setup is safe and idempotent
- [ ] Verify package format, manifest, table counts, Storage counts, and checksums against real structure where possible
- [ ] Run project validation

## Acceptance
Super Admin can trigger a server-side backup package without exposing service-role credentials.
Backup package includes audited tables, audited Storage buckets, manifest, counts, checksums, and compressed archive format.
No restore, dashboard, scheduling, unrelated data changes, RLS weakening, or mock production data is introduced.