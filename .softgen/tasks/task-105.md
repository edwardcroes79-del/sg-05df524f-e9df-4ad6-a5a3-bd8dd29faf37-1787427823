---
title: Customer wallet email receipts
status: done
priority: high
type: bug
tags: [customer-wallet, notifications, email, stamps]
created_by: agent
created_at: 2026-10-01T16:56:22Z
position: 105
---

## Notes
Investigated and fixed the Customer Wallet “Notifications & Preferences” Email Receipts toggle. Traced the toggle, saved preference, database field, existing email infrastructure, and stamp-issued email workflow. Added a persistent authenticated customer preference field and secure customer preference API. The toggle now saves for the authenticated customer, restores after refresh/login, and controls whether stamp receipt emails are sent. Applied consistently to Business/Staff Issue Stamp and Quick Issue Stamp. Receipt sending uses authenticated sessions and server-side transaction/customer lookups; it does not trust a customer ID supplied by the client. Receipts are requested only after successful committed stamp transactions. Email delivery failures are handled gracefully: the stamp remains recorded and UI success is not converted into a false stamp failure. Did not change unrelated notification preferences, reward redemption, billing, permissions, routes, or stamp logic. Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect Customer Wallet settings toggle and preference persistence
- [x] Inspect database types/schema for existing customer notification preference fields
- [x] Inspect existing email infrastructure and stamp-issued notification utilities
- [x] Inspect Business/Staff Issue Stamp and Quick Issue Stamp flows
- [x] Persist and restore the authenticated customer’s email receipt preference securely
- [x] Send stamp receipt emails after successful stamp transactions only when enabled
- [x] Apply preference consistently to all stamp-issuing flows without breaking stamp success on email failure
- [x] Run project validation

## Acceptance
Email Receipts toggle persists for the authenticated customer and restores correctly after refresh/login.
Stamp receipt emails are sent only when the customer preference is enabled across standard and Quick Issue Stamp flows.
Stamp creation remains successful even if receipt email delivery fails.