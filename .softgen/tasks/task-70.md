---
title: Business Approval Lifecycle Restoration
status: in_progress
priority: urgent
type: bug
tags: [admin, approval, email, business-lifecycle]
created_by: agent
created_at: 2026-09-27T03:24:50Z
position: 70
---

## Notes
Restore the correct business lifecycle distinction in Super Admin Merchants & Subscriptions. Pending businesses must show Approve and use the first-time approval workflow. Already-approved active businesses show Suspend. Already-approved suspended businesses show Activate. Investigation found the UI had drifted toward a generic Activate/Suspend action for pending businesses, while the approval email route could also approve non-pending records. The UI now renders Approve only for `status = pending`, and the existing Suspend/Activate button remains only for non-pending records. The approval API now requires pending status for first-time approval, records `approved_at` and `approved_by`, preserves plan/trial/subscription fields, and uses retry mode only for resending approval email without changing lifecycle status. Approval emails continue to use the existing server-side Nodemailer/Titan SMTP architecture, prefer the registered business email, record provider success/failure in `email_logs` and `businesses.approval_email_status`, and use `https://royaltystamp.com/dashboard`.

## Checklist
- [x] Inspect business status fields and approval email fields
- [x] Inspect current Approve, Activate, Suspend, and resend handlers
- [x] Restore pending-specific Approve button in Merchants & Subscriptions
- [x] Keep Suspend/Activate only for already-approved non-pending businesses
- [x] Add approval audit fields for approved timestamp and Super Admin approver
- [x] Tighten approval API so first-time approval only applies to pending businesses
- [x] Preserve resend approval email without changing business status
- [ ] Run validation and targeted approval lifecycle regression checks
- [ ] Verify real provider response or identify missing test-recipient blocker

## Acceptance
Pending businesses show Approve, not Activate.
After approval, the database status becomes active and the UI changes to Suspend.
Suspended approved businesses show Activate.
Approval email status is accurate and retryable without changing subscription/trial data.