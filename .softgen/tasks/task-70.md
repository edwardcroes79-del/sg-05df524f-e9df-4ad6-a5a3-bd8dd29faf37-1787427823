---
title: Business Approval Lifecycle Restoration
status: in_progress
priority: urgent
type: bug
tags: [admin, approval, email, merchants]
created_by: agent
created_at: 2026-09-27T03:23:06Z
position: 70
---

## Notes
Restore the correct Super Admin business lifecycle in Merchants & Subscriptions. Pending businesses must show Approve and use the existing approval API/email workflow. Already-approved active businesses must show Suspend. Already-approved suspended businesses must show Activate. Do not simply rename Activate to Approve. Preserve the existing Suspend/Activate workflow for approved businesses, preserve trial/subscription/plan data, and ensure approval email status is based on the server-side provider response. Approval email links must use https://royaltystamp.com.

## Checklist
- [ ] Inspect current merchant action rendering and approval/suspend handlers
- [ ] Restore Approve button only for pending businesses
- [ ] Preserve Suspend/Activate only for non-pending approved businesses
- [ ] Verify approval audit fields available in businesses schema
- [ ] Update approval API to validate pending approval and record audit fields where supported
- [ ] Preserve resend approval email behavior without duplicating accounts
- [ ] Run project validation
- [ ] Verify database pending → active and active → suspended → active transitions

## Acceptance
Pending businesses show Approve and use the approval email workflow.
Approved active businesses show Suspend, and approved suspended businesses show Activate.
Approval email status is accurate and retryable without changing subscription/trial data.