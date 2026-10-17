---
title: Backup Validation 413 Fix
status: done
priority: urgent
type: bug
tags: [backups, validation, upload, admin]
created_by: agent
created_at: 2026-10-17T03:13:05Z
position: 232
---

## Notes
Diagnosed and fixed the existing backup validation workflow where validating an uploaded backup package failed with HTTP 413 and a plain-text response instead of JSON. Evidence found: the frontend sends the selected `.tar.gz` backup as the raw request body with `Content-Type` set to gzip/octet-stream or octet-stream, not JSON/base64, so there is no JSON expansion in the browser request. The validation API disables the Next.js body parser and streams the raw request to a temporary file before running `validateBackupArchive`. Vercel documentation fetched during diagnosis states Vercel Functions have a 4.5 MB request body limit and return HTTP 413 `FUNCTION_PAYLOAD_TOO_LARGE` when exceeded. Therefore, uploaded backups above that platform limit can be rejected by Vercel before the Next.js API handler can run or return JSON.

Smallest safe fix applied: defined a conservative 4 MB direct validation upload limit, pre-checks file size on the frontend, returns JSON 413 from the API when the request reaches the handler, enforces the same limit while streaming the raw body, and handles plain-text/non-JSON 413 responses safely. Larger production backup validation requires a direct object-storage upload flow instead of proxying the file through a Vercel Function. Restore behavior was not changed or run. No production data, backup records, customer records, stamps, rewards, or transaction history were modified.

Files changed: `src/pages/api/admin/backups/validate-upload.ts`, `src/pages/admin/index.tsx`, and this task file. Actual validation completed: `check_for_errors` passed with no CSS, linting, type checking, or server errors. The implemented code path prevents oversized client uploads before fetch, returns JSON 413 for declared/streamed oversized requests that reach the API, preserves existing archive structure/integrity validation for allowed packages, and never starts restore from validation failure. Not executed in-browser in an authenticated Super Admin session: selecting a valid small backup, a near-4 MB valid backup, a malformed backup, and an over-limit backup. Not executed against a deployed Vercel URL: confirming Vercel’s platform-level plain-text 413 response, because deployment was not performed.

## Checklist
- [x] Inspect frontend backup upload/validation flow and request payload format
- [x] Inspect backup validation API endpoint body parsing, size handling, and response format
- [x] Inspect backup archive/validator utilities for existing size, structure, and integrity checks
- [x] Identify whether 413 is caused by JSON/base64 expansion, API body parser limits, or hosting/proxy limits
- [x] Implement smallest safe fix for legitimate packages and clear oversized-package errors
- [x] Harden frontend handling for non-JSON/plain-text error responses
- [x] Verify valid small backup, oversized backup handling, malformed backup handling, and no restore trigger within code/static checks; document browser/deployed limitations
- [x] Run project checks and document actual limits, files changed, and verification limits

## Acceptance
Backup validation accepts legitimate packages within a defined safe limit, oversized or malformed packages show clear errors, plain-text 413 responses are handled safely, and validation failures never trigger restoration.