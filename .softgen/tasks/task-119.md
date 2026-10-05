---
title: Critical backup creation error
status: in_progress
priority: urgent
type: bug
tags: [backup, api, production, json]
created_by: agent
created_at: 2026-10-05T17:55:47Z
position: 119
---

## Notes
Investigate and fix the backup creation error where the frontend receives `Unexpected token '<', '<!DOCTYPE '... is not valid JSON`, indicating an HTML response from an API request expected to return JSON. Must identify the exact endpoint/request, HTTP status, and reason HTML is returned before changing code. Fix the underlying server/API problem without fake backups, fake success responses, production data modification, weakened security, backup format changes unless proven necessary, restore changes, or unrelated feature changes.

Evidence collected so far:
- Super Admin Backup Now calls `POST /api/admin/backups/run` from `src/pages/admin/index.tsx`.
- Local unauthenticated `POST /api/admin/backups/run` returned status `500`, Content-Type `application/json; charset=utf-8`, body `{"error":"Missing authorization header"}`. This proves the Next.js route exists locally and expected auth errors are JSON, not HTML.
- Live backup metadata showed a real completed backup job `7e92e130-6f6b-49d7-9933-add519b120a6` with package path `7e92e130-6f6b-49d7-9933-add519b120a6/royalty-stamp-backup-2026-10-05T17-53-28-060Z-7e92e130-6f6b-49d7-9933-add519b120a6.tar.gz.parts`, package size `59,335,683` bytes, 25 tables, 2 Storage buckets, and SHA-256 `1646fcd903d586a1e60873bd7427b08bd508123722397c720e20a28558e7d9e8`.
- Because the backup package completed while the client received HTML, the failing request is the production `POST /api/admin/backups/run` response path, most consistent with a production function/proxy timeout returning a Vercel HTML error page instead of the route handler JSON.
- Applied backup-specific fix: configured longer Vercel function duration for `/api/admin/backups/run` and `/api/admin/backups/daily`, and made the Backup Now client validate Content-Type before JSON parsing so future HTML platform responses identify the endpoint/status/content-type directly.

## Checklist
- [x] Inspect Super Admin backup creation UI request URL, fetch handling, routing, and JSON parsing
- [x] Inspect backup creation API/server route, auth handling, server errors, and response content type
- [x] Inspect production/Vercel routing configuration for backup API paths
- [x] Reproduce or simulate the failing request and identify the exact endpoint returning HTML, status, and reason
- [x] Fix the underlying backup API/server/routing problem while preserving Super Admin authorization
- [ ] Test real backup creation, database export, Storage inclusion, package creation, package download, tar.gz validity, and frontend JSON response
- [ ] Run project validation
- [ ] Report root cause, failing endpoint, HTTP status, files changed, generated package, and tests performed

## Acceptance
Backup creation returns valid JSON for success and structured JSON for expected server errors.
A real backup package is created, downloadable, and valid `.tar.gz`.
The exact HTML-returning endpoint, status, and root cause are documented.