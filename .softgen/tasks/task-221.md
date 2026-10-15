---
title: Owner Security Alerts Dashboard
status: in_progress
priority: high
type: feature
tags: [dashboard, alerts, anti-fraud]
created_by: agent
created_at: 2026-10-15T13:57:40Z
position: 221
---

## Notes
Added `src/pages/api/business/security-alerts.ts` to list business-scoped anti-fraud security alerts and mark alerts as read. The API authenticates the bearer token server-side, verifies the user is the business owner, an active owner/admin/corporate_admin business user, or a Super Admin, and denies staff/cross-business access before returning or mutating alerts. Added `src/pages/dashboard/security-alerts.tsx` with loading, empty, error, summary cards, alert list, detail dialog, and mark-as-read interaction. Updated `src/components/dashboard/DashboardLayout.tsx` to show a Security Alerts navigation item with unread badge only when the API authorizes the current user. No client-side service-role access was added. No email/SMS/external notifications were added.

## Checklist
- [x] Add secure API to list security alerts for an authorized business Owner/Admin
- [x] Add secure API to mark an alert as read for an authorized business Owner/Admin
- [x] Add dashboard Security Alerts/Activity UI with empty, loading, and error states
- [x] Display staff, member, identifier, program, attempt count, first/latest timestamps, reason, and read status
- [x] Add unread badge in dashboard navigation or dashboard section
- [x] Add alert detail/review interaction
- [x] Prevent Staff UI access while preserving server-side denial

## Acceptance
Authorized Owner/Admin users can review repeated cooldown-blocked attempt alerts and mark them read. Staff and other businesses cannot access or mutate alerts.