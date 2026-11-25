---
title: Business presence status in super admin dashboard
status: in_progress
priority: urgent
type: feature
tags: [presence, super-admin, realtime, supabase]
created_by: agent
created_at: 2026-11-25T13:27:28Z
position: 297
---
## Notes
Implement a lightweight online/offline presence feature for businesses in the Super Admin dashboard. A business is online when at least one authorized business admin or staff user has an active authenticated session and has reported a heartbeat within the last 5 minutes. Presence must be derived from the authenticated user's authorized business relationship, exclude super admins, and update in real time in the Super Admin business management table without page refresh. Preserve all existing auth, billing, stamping, QR, customer, rewards, and password-management behavior.

## Checklist
- [ ] Inspect existing Supabase schema, auth relationships, role tables, and any current presence/session infrastructure
- [ ] Identify the existing Super Admin business management table render path and the business-authenticated surface where a heartbeat can run safely
- [ ] Add lightweight presence persistence that updates one record per authorized user instead of inserting a new row per heartbeat
- [ ] Enforce secure business identity derivation from the authenticated user's authorized relationship and exclude super admin activity
- [ ] Send a heartbeat every 60 seconds while a business admin or staff session is active, and stop on logout/session loss
- [ ] Add efficient realtime status updates for the Super Admin business management dashboard
- [ ] Show online/offline badge and last seen timestamp next to each business in the existing Super Admin table
- [ ] Validate behavior for multi-user businesses, logout, inactivity timeout, closed browser fallback, and expired sessions
- [ ] Run project error checks and document implementation, database changes, and test results

## Acceptance
The Super Admin dashboard shows each business as Online or Offline with a colored indicator and last seen value when offline.
A business remains Online while any authorized business admin or staff member is still active within the last 5 minutes.
Status changes appear automatically in the Super Admin dashboard without refreshing the page.