---
title: Add-on Payment Proof Workflow
status: done
priority: urgent
type: bug
tags: [billing, add-ons, payment-proof, admin]
created_by: agent
created_at: 2026-09-26T20:42:22Z
position: 54
---

## Notes
Completed as part of the consolidated Add-on Subscription Integration fix in task 55. Business add-on purchases now use the existing subscription payment workflow with a full subscription-change payment, manual payment instructions, payment reference, private payment-proof upload to the `payment-proofs` storage bucket, signed proof viewing for the owning Business and Super Admin, and Super Admin approval/rejection that preserves history. Manual bank-transfer approval requires uploaded proof. Approved add-ons activate only through Super Admin approval, while rejected add-ons remain inactive. Existing normal subscription billing remains unchanged.

## Checklist
- [x] Inspect existing plan/subscription payment request and proof upload workflow
- [x] Identify current payment proof storage field, upload path, and admin review display
- [x] Update Business add-on purchase flow to show instructions, amount, reference, proof upload, and pending/rejected status
- [x] Associate uploaded proof with the exact business, add-on request, payment reference, amount, and payment record
- [x] Ensure Super Admin review receives and displays real add-on payment proof
- [x] Ensure approval activates only after payment proof exists for manual bank-transfer payments
- [x] Prevent duplicate pending/active subscriptions for the same add-on
- [x] Ensure rejection preserves history without activation
- [x] Verify Business Admin scope, staff restrictions, and cross-business proof isolation
- [x] Verify existing subscription billing remains unchanged
- [x] Run project validation and targeted workflow checks

## Acceptance
Business Admins can upload real payment proof for manual add-on purchases.
Super Admin can view proof and approve or reject add-on payments through the existing review flow.
Approved add-ons activate and rejected add-ons remain inactive without breaking existing subscription billing.