---
title: Customer wallet email receipts
status: in_progress
priority: high
type: bug
tags: [customer-wallet, notifications, email, stamps]
created_by: agent
created_at: 2026-10-01T16:56:22Z
position: 105
---

## Notes
Investigate and fix the Customer Wallet “Notifications & Preferences” Email Receipts toggle. Trace the toggle, saved preference, database field, and stamp-issued email workflow. Ensure the authenticated customer's preference saves persistently, restores after refresh/login, and controls whether stamp receipt emails are sent. Apply consistently to Business/Staff Issue Stamp and Quick Issue Stamp. Use the authenticated account and existing secure email infrastructure; never trust a customer ID supplied by the client without authorization checks. Send receipts only after a stamp transaction successfully commits. Email delivery failures must not roll back or falsely report stamp failure. Check existing email settings, RLS, permissions, and database schema before changes. Reuse existing fields and email utilities where possible. Do not change unrelated notification preferences, reward redemption, billing, or other functionality.

## Checklist
- [x] Inspect Customer Wallet settings toggle and preference persistence
- [x] Inspect database types/schema for existing customer notification preference fields
- [x] Inspect existing email infrastructure and stamp-issued notification utilities
- [x] Inspect Business/Staff Issue Stamp and Quick Issue Stamp flows
- [x] Persist and restore the authenticated customer’s email receipt preference securely
- [x] Send stamp receipt emails after successful stamp transactions only when enabled
- [x] Apply preference consistently to all stamp-issuing flows without breaking stamp success on email failure
- [ ] Run project validation

## Acceptance
Email Receipts toggle persists for the authenticated customer and restores correctly after refresh/login.
Stamp receipt emails are sent only when the customer preference is enabled across standard and Quick Issue Stamp flows.
Stamp creation remains successful even if receipt email delivery fails.