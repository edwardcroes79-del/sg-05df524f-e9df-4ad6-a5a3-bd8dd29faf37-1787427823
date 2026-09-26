---
title: Add-on Payment Proof Workflow
status: in_progress
priority: urgent
type: bug
tags: [billing, add-ons, payment-proof, admin]
created_by: agent
created_at: 2026-09-26T20:42:22Z
position: 54
---

## Notes
Fix the Customer Capacity Add-on purchase workflow so Business Admins can complete the same payment verification process used by existing Royalty Stamp billing. Current broken behavior: Business can request an add-on purchase, but no payment proof upload is offered; Super Admin sees a pending payment with "No proof uploaded." Inspected the existing billing architecture: `subscription_payments` already stores `payment_reference` and `payment_proof_url`; Super Admin review already displays `payment_proof_url`; architecture notes identify Supabase Storage bucket `payment-proofs` as the existing payment-proof storage pattern. The add-on purchase flow now reuses `subscription_payments.payment_proof_url` and the `payment-proofs` bucket from Business Billing, scoped to the owner business and the exact pending add-on payment record. Activation still only happens from Super Admin approval.

## Checklist
- [x] Inspect existing plan/subscription payment request and proof upload workflow
- [x] Identify current payment proof storage field, upload path, and admin review display
- [x] Update Business add-on purchase flow to show instructions, amount, reference, proof upload, and pending/rejected status
- [x] Associate uploaded proof with the exact business, add-on request, payment reference, amount, and payment record
- [ ] Ensure Super Admin review receives and displays real add-on payment proof
- [ ] Ensure approval activates the add-on exactly once and rejection preserves history without activation
- [ ] Verify Business Admin scope, staff restrictions, and cross-business proof isolation
- [ ] Verify existing subscription billing remains unchanged
- [ ] Run project validation and targeted workflow checks

## Acceptance
Business Admins can upload real payment proof for manual add-on purchases.
Super Admin can view proof and approve or reject add-on payments through the existing review flow.
Approved add-ons activate and rejected add-ons remain inactive without breaking existing subscription billing.