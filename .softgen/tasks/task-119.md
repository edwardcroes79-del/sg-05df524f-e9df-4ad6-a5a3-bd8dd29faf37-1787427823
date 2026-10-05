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

## Checklist
- [x] Inspect Super Admin backup creation UI request URL, fetch handling, routing, and JSON parsing
- [x] Inspect backup creation API/server route, auth handling, server errors, and response content type
- [x] Inspect production/Vercel routing configuration for backup API paths
- [ ] Reproduce or simulate the failing request and identify the exact endpoint returning HTML, status, and reason
- [ ] Fix the underlying backup API/server/routing problem while preserving Super Admin authorization
- [ ] Test real backup creation, database export, Storage inclusion, package creation, package download, tar.gz validity, and frontend JSON response
- [ ] Run project validation
- [ ] Report root cause, failing endpoint, HTTP status, files changed, generated package, and tests performed

## Acceptance
Backup creation returns valid JSON for success and structured JSON for expected server errors.
A real backup package is created, downloadable, and valid `.tar.gz`.
The exact HTML-returning endpoint, status, and root cause are documented.