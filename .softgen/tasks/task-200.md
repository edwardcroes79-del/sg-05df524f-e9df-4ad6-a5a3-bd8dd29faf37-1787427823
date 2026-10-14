---
title: Excel Member Reconciliation APIs
status: done
priority: urgent
type: feature
tags: [api, reconciliation, authorization]
created_by: agent
created_at: 2026-10-14T17:07:23Z
position: 200
---

## Notes
Implemented preview and confirmation APIs using the existing owner-only `resolveBusinessForUser()` authorization mechanism. Preview parses the existing Royalty Stamp export format, scopes matching to the authorized business and selected program, and never mutates data. Confirmation revalidates authorization, entitlement, target program, selected candidates, and preview token before reversible membership removal.

## Checklist
- [x] Add reconciliation preview API with owner auth, entitlement check, program scoping, workbook validation, and no mutation
- [x] Add reconciliation confirmation API with owner auth, entitlement check, stale-preview token validation, explicit confirmation text, and safe candidate filtering
- [x] Match by stable contact identifiers from the existing export format, never by name alone
- [x] Flag invalid, duplicate, ambiguous, outside-program, retained, skipped, and removable memberships
- [x] Preserve customer profiles, stamps, rewards, and history by updating membership status instead of deleting records

## Acceptance
Unauthorized requests are rejected before service-role access. Preview never removes memberships. Confirmation affects only active memberships in the authorized business and selected loyalty program.