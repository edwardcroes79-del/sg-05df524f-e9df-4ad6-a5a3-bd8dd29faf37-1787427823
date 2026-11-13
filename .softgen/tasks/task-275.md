---
title: Unconfirmed auth user deletion
status: in_progress
priority: urgent
type: bug
tags: [superadmin, auth, security]
created_by: agent
created_at: 2026-11-13T18:24:29Z
position: 275
---

## Notes
Follow-up bug: the Superadmin Delete Unconfirmed Account dialog accepts typed-email confirmation, but the delete endpoint returns "A valid target user ID is required." This indicates the selected unconfirmed user object is not carrying the Supabase Auth user ID into the POST body, or the field name is mismatched between the unconfirmed-users list endpoint, `UnconfirmedAuthUser` UI type, and delete request.

Scope is strictly limited to fixing the ID-passing failure while preserving the existing server-side security checks.

Protected constraints:
- Do not change customer registration/synchronization from task 274.
- Do not modify email confirmation or resend-confirmation behavior.
- Do not weaken UUID validation or backend eligibility checks.
- Do not modify Stamp Flow, Quick Stamp, loyalty transactions, rewards, unrelated RLS, triggers, or auth settings.
- Do not perform destructive live deletion without a dedicated test account.

## Checklist
- [x] Reopen task evidence and convert this task back to in-progress for the bug fix.
- [ ] Inspect how unconfirmed Auth users are retrieved and which ID field is returned.
- [ ] Inspect how the Superadmin UI stores the unconfirmed user ID and submits the delete request.
- [ ] Inspect how the delete endpoint validates and uses the target Auth user ID.
- [ ] Fix the root ID field mismatch without weakening security checks.
- [ ] Validate TypeScript/lint/build checks.
- [ ] Document the exact root cause, files changed, backend security status, and test results.

## Acceptance
The delete request sends the selected account’s real Supabase Auth user ID to the backend.
The backend keeps UUID validation and independent eligibility checks before deletion.
The Unconfirmed Auth Users list, typed-email dialog, and resend-confirmation action continue working normally.