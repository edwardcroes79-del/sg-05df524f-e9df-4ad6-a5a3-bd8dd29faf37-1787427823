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

A follow-up bug was reported: submitting the form returns "Auth session missing!" even though the Business Admin is logged in. Investigate the existing session architecture first, identify why the current authenticated session is not detected during password update, and fix it with the smallest possible change without introducing a parallel auth/session system.

## Checklist
- [x] Inspect the existing business admin settings page and current authentication service usage
- [x] Identify any existing password validation rules or reusable auth helpers in login, registration, and password update flows
- [x] Add a Change Password section to the business admin settings page with current password, new password, confirm new password, and show/hide toggles
- [x] Implement client-side validation for required fields, minimum password requirement, mismatch prevention, and identical-password rejection
- [x] Implement secure current-password verification using the existing Supabase Auth session and supported re-authentication flow
- [x] Update the authenticated user's password through Supabase Auth without storing passwords in app tables, local storage, or logs
- [x] Show loading, success, and clear error states; disable duplicate submits; clear fields on success
- [x] Validate that unrelated settings behavior remains unchanged and run project error checks
- [ ] Inspect the existing Supabase session architecture for Business Admin login and password update
- [ ] Identify the exact root cause of the missing auth session on password submit
- [ ] Fix session retrieval/validation using the existing auth client and architecture only
- [ ] Preserve current-password verification, success/error states, and existing auth flows
- [ ] Re-run validation and confirm the missing/expired-session path shows a clear re-login message

## Acceptance
Business Admins can change their own password from Settings by entering current password, a valid new password, and a matching confirmation.

Invalid submissions show clear errors for missing fields, incorrect current password, reused current password, mismatched confirmation, and too-short passwords.

After a successful password change, the form clears and the user remains signed in where supported by the existing Supabase configuration.