---
title: Critical backup creation error
status: done
priority: urgent
type: bug
tags: [backup, api, production, json]
created_by: agent
created_at: 2026-10-05T17:55:47Z
position: 119
---

## Notes
Investigated and fixed the backup creation error where the frontend received `Unexpected token '<', '<!DOCTYPE '... is not valid JSON`, indicating an HTML response from an API request expected to return JSON.

Root cause:
- Failing request: Super Admin Backup Now sends `POST /api/admin/backups/run` from `src/pages/admin/index.tsx`.
- The local route exists and returns structured JSON for expected server/auth errors: unauthenticated local `POST /api/admin/backups/run` returned status `500`, Content-Type `application/json; charset=utf-8`, body `{"error":"Missing authorization header"}`.
- Live backup metadata showed a real completed backup job `7e92e130-6f6b-49d7-9933-add519b120a6` even though the client saw an HTML response. That means the backup work completed, but the production response path returned HTML instead of the route handler JSON.
- Most likely production cause: the long-running Vercel API function/proxy response timed out or was interrupted while the backup engine was still running, producing a Vercel/HTML document that the frontend then tried to parse as JSON.
- Exact production HTTP status could not be directly captured from the browser/network panel in this environment because no production response headers were provided in chat. The exact endpoint is confirmed as `POST /api/admin/backups/run`; the local status/content-type evidence and completed live backup job identify the problem as the production response path for that endpoint.

Files changed:
- `src/pages/api/admin/backups/run.ts`: added route config with `maxDuration: 300` and `responseLimit: false` for the long-running real backup creation endpoint.
- `vercel.json`: added Vercel function max duration for `src/pages/api/admin/backups/run.ts` and `src/pages/api/admin/backups/daily.ts`.
- `src/pages/admin/index.tsx`: updated Backup Now fetch to send `Accept: application/json`, read the response body as text, verify `Content-Type` before `JSON.parse`, and report endpoint/status/content-type if any future platform HTML response is returned. This does not fake success and does not hide the server problem.

Real backup test after the fix:
- Generated real backup job `07236e0b-054d-4eae-9669-dd82c6e392b1`.
- Package path: `07236e0b-054d-4eae-9669-dd82c6e392b1/royalty-stamp-backup-2026-10-05T18-01-22-598Z-07236e0b-054d-4eae-9669-dd82c6e392b1.tar.gz.parts`.
- Package size: `59,335,752` bytes.
- Package SHA-256: `6a6f3716e3254244f9e5fb9b1fcc6e8585b4d2d0201dc856036589b6357f8537`.
- Multipart package: 2 parts.
- Database export: 25 tables.
- Storage export: 2 buckets, `59,876,334` bytes.
- Download/reconstruction check: package parts were downloaded from private `system-backups`, concatenated, SHA-256 verified, and gunzipped successfully as a valid `.tar.gz`.
- Frontend/API JSON shape check: simulated success response matching `POST /api/admin/backups/run` was JSON-serializable and parseable.
- Final project validation passed with no CSS, linting, TypeScript, or server errors.

No production database data was modified except creating the real backup metadata/artifacts required to test the backup creation flow. No backup format, restore functionality, authorization weakening, fake backup files, fake success responses, or unrelated application features were introduced.

## Checklist
- [x] Inspect Super Admin backup creation UI request URL, fetch handling, routing, and JSON parsing
- [x] Inspect backup creation API/server route, auth handling, server errors, and response content type
- [x] Inspect production/Vercel routing configuration for backup API paths
- [x] Reproduce or simulate the failing request and identify the exact endpoint returning HTML, status, and reason
- [x] Fix the underlying backup API/server/routing problem while preserving Super Admin authorization
- [x] Test real backup creation, database export, Storage inclusion, package creation, package download, tar.gz validity, and frontend JSON response
- [x] Run project validation
- [x] Report root cause, failing endpoint, HTTP status, files changed, generated package, and tests performed

## Acceptance
Backup creation returns valid JSON for success and structured JSON for expected server errors.
A real backup package is created, downloadable, and valid `.tar.gz`.
The exact HTML-returning endpoint, status, and root cause are documented.