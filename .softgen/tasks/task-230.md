---
title: Make Phone Number Required in Business Onboarding
status: done
priority: high
type: bug
tags: [onboarding, validation]
created_by: agent
created_at: 2026-10-15T16:10:00Z
position: 230
---

## Notes
Make the Phone Number field mandatory on Step 1 of the Business Onboarding wizard, as it was missed during the initial registration update.
- Update frontend label to include an asterisk (*).
- Add frontend validation (trim whitespace, reject empty, existing phone format rules).
- Block progression to Step 2 if invalid.
- Apply equivalent server-side validation to the onboarding API endpoint.
- Preserve existing styling and behavior.

## Checklist
- [x] Locate onboarding page and API endpoint.
- [x] Update frontend validation logic for phone number on Step 1.
- [x] Update frontend UI to show "Phone Number *".
- [x] Update backend API validation to require phone number (using a Postgres `BEFORE INSERT` trigger to protect direct Supabase insertions).
- [x] Run checks and verify constraints.

## Acceptance
Empty or whitespace-only phone numbers block onboarding progression both on frontend and backend. Valid phone numbers pass.