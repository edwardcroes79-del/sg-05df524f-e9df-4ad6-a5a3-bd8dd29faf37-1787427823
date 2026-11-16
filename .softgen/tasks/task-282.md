---
title: Setup review, approval and activation
status: in_progress
priority: urgent
type: feature
tags: [setup-assistance, business-settings, superadmin, activation]
created_by: agent
created_at: 2026-11-16T16:25:00Z
position: 282
---

## Notes
Phase 3 of Setup Assistance. A Business Admin reviews the Phase 2 draft (stored in setup_drafts, one per request), then either approves (draft becomes live, request Completed) or requests changes (status Changes Requested, feedback saved, Superadmin reopens the same workspace and resubmits, status returns to Ready for Review). Activation and completion must happen in one database transaction, idempotently, applied only to the request's business. Must preserve customers, loyalty cards, stamp balances, transactions, rewards and redemptions; never create duplicate programs. Reuse existing notification tables and the shared LoyaltyCard preview. Do not touch Issue Stamp, Quick Issue Stamp, the stamp engine, staff, billing or customer registration.

## Checklist
- [ ] Inspect Phase 2 draft storage, how live program/branding fields are written, existing notification tables, and whether customer progress depends on program fields (stamp target, rewards)
- [ ] Post a brief activation-safety plan based on the actual schema
- [ ] Database: add changes_requested status, approval/feedback/activated-reference columns, and an atomic SECURITY DEFINER approval function that activates the exact draft and completes the request in one transaction
- [ ] Server APIs: business review (load own draft read-only), approve, request changes; Superadmin reopen of Changes Requested requests and resubmit to Ready for Review
- [ ] Business UI: Ready for Review notification, read-only "Review My Setup" preview, Approve & Activate confirmation, Request Changes feedback dialog, success message
- [ ] Superadmin UI: Changes Requested and Completed statuses, feedback display, reopen workspace, approval date/approver, read-only completed requests
- [ ] Notifications for ready-for-review, revised draft, approval and change requests without duplicates
- [ ] Verify cross-business isolation, duplicate-approval protection, customer data preservation, and no changes to stamp flows

## Acceptance
- A Business Admin can review the pending draft, approve it so it becomes the live card and program, and the request shows Completed with approver and date.
- A Business Admin can request changes with feedback; Superadmin reopens the same workspace and resends, and the business can review again.
- Existing customer stamps, rewards and transaction history are unchanged after activation.