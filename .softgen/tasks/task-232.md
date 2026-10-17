---
title: Backup Validation 413 Fix
status: in_progress
priority: urgent
type: bug
tags: [backups, validation, upload, admin]
created_by: agent
created_at: 2026-10-17T03:13:05Z
position: 232
---

## Notes
Diagnose and fix the existing backup validation workflow where validating an uploaded backup package fails with HTTP 413 and a plain-text response instead of JSON. Inspect the frontend upload/validation request, validation API endpoint, hosting/proxy and application body-size limits, package transmission/parsing, and any streaming or multipart support. Determine the exact layer responsible for 413 before changing code. Prefer the smallest safe fix that preserves backup format compatibility, authentication/authorization, validation/integrity checks, and restore safety. Do not run a restore, modify production data, weaken validation, log backup contents, or deploy automatically.

## Checklist
- [ ] Inspect frontend backup upload/validation flow and request payload format
- [ ] Inspect backup validation API endpoint body parsing, size handling, and response format
- [ ] Inspect backup archive/validator utilities for existing size, structure, and integrity checks
- [ ] Identify whether 413 is caused by JSON/base64 expansion, API body parser limits, or hosting/proxy limits
- [ ] Implement smallest safe fix for legitimate packages and clear oversized-package errors
- [ ] Harden frontend handling for non-JSON/plain-text error responses
- [ ] Verify valid small backup, oversized backup handling, malformed backup handling, and no restore trigger
- [ ] Run project checks and document actual limits, files changed, and verification limits

## Acceptance
Backup validation accepts legitimate packages within a defined safe limit, oversized or malformed packages show clear errors, plain-text 413 responses are handled safely, and validation failures never trigger restoration.