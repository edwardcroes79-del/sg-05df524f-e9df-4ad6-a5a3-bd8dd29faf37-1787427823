---
title: Make Business Registration Phone Number Required
status: in_progress
priority: high
type: feature
tags: [auth, registration, validation]
created_by: agent
created_at: 2026-10-15T16:00:00Z
position: 229
---

## Notes
Make the Phone Number field mandatory on Step 1 of the Business Registration wizard.
- Update frontend label to include an asterisk (*).
- Add frontend validation (trim whitespace, reject empty, existing phone format rules).
- Block progression to Step 2 if invalid.
- Apply equivalent server-side validation to `register-business.ts`.
- Preserve existing styling and behavior.

## Checklist
- [x] Inspect `register.tsx` and `register-business.ts`.
- [x] Update frontend Zod schema or validation logic for phone number.
- [x] Update frontend UI to show "Phone Number *".
- [x] Update backend API validation to require phone number and validate format.
- [x] Run checks and verify constraints.

## Acceptance
Empty or whitespace-only phone numbers block registration both on frontend and backend. Valid phone numbers pass. Other registration steps remain fully functional.