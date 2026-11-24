---
title: Business admin change password
status: in_progress
priority: high
type: feature
tags: [settings, auth, supabase]
created_by: agent
created_at: 2026-11-24T11:48:04Z
position: 295
---
## Notes
Add a secure Change Password section to the existing Business Admin Settings page only. Reuse the current Supabase Auth architecture and existing validation patterns where possible. Verify the current password through secure re-authentication, update the password through Supabase Auth, preserve the logged-in session where supported, and avoid any changes to super admin, staff, billing, registration, password recovery, or unrelated settings behavior.

A follow-up bug was reported: submitting the form returns "Auth session missing!" even though the Business Admin is logged in. Investigation showed the active session is established through the shared browser Supabase client, but the current-password verification helper creates another browser auth client and signs in/signs out immediately before `updateUser()`. The failure occurs after the session is read in `src/pages/dashboard/settings.tsx` and before the password update call, so the active session must be restored and revalidated before updating the password.

Actual root cause (confirmed in code): `verifyCurrentPassword` in `src/services/authService.ts` called `verificationClient.auth.signOut()` with no scope. Supabase defaults to `scope: "global"`, which revokes every session for the user on the auth server, including the dashboard session. The dashboard kept its now-revoked token locally, so `getSession()` passed but `updateUser()` was rejected server-side ("Auth session missing"), surfaced as "session has expired". Fix: `signOut({ scope: "local" })` revokes only the temporary verification session. Before verify and update, the session is now validated server-side via `getUser()` with a single `refreshSession()` fallback, and `updateUser` is retried once after a refresh. No database changes.

## Checklist
- [x] Inspect the existing business admin settings page and current authentication service usage
- [x] Identify any existing password validation rules or reusable auth helpers in login, registration, and password update flows
- [x] Add a Change Password section to the business admin settings page with current password, new password, confirm new password, and show/hide toggles
- [x] Implement client-side validation for required fields, minimum password requirement, mismatch prevention, and identical-password rejection
- [x] Implement secure current-password verification using the existing Supabase Auth session and supported re-authentication flow
- [x] Update the authenticated user's password through Supabase Auth without storing passwords in app tables, local storage, or logs
- [x] Show loading, success, and clear error states; disable duplicate submits; clear fields on success
- [x] Validate that unrelated settings behavior remains unchanged and run project error checks
- [x] Inspect the existing Supabase session architecture for Business Admin login and password update
- [x] Identify the exact root cause of the missing auth session on password submit
- [x] Fix session retrieval/validation using the existing auth client and architecture only
- [x] Preserve current-password verification, success/error states, and existing auth flows
- [x] Re-run validation and confirm the missing/expired-session path shows a clear re-login message
- [x] Replace global sign-out of the verification client with local-scope sign-out
- [x] Validate session server-side with refresh fallback before verify/update
- [ ] Live test: correct current password succeeds and dashboard session stays active
- [ ] Live test: incorrect current password rejected, session intact
- [ ] Live test: login with new password, password recovery unaffected

## Acceptance
Business Admins can change their own password from Settings by entering current password, a valid new password, and a matching confirmation.

Invalid submissions show clear errors for missing fields, incorrect current password, reused current password, mismatched confirmation, and too-short passwords.

After a successful password change, the form clears and the user remains signed in where supported by the existing Supabase configuration.