---
title: Spanish dashboard core pages
status: todo
priority: high
type: feature
tags: [i18n, spanish, dashboard-pages]
created_by: agent
created_at: 2026-09-30T16:27:53Z
position: 92
---

## Notes
Translate core Business Dashboard pages using the existing centralized i18n system. Scope includes Dashboard overview, analytics/metric labels, Customers, Loyalty Programs list/detail/new forms, Stamps & Rewards, Issue Stamp, Redeem Reward, Quick Issue Stamp, QR Codes, and Card Customizer text if present in these dashboard surfaces. English remains default. Use translation keys only. Do not translate business/customer-created content or database values.

## Checklist
- [ ] Inspect dashboard overview, customers, programs, scan, quick-stamp, and QR pages
- [ ] Add missing English and Spanish translation keys for headings, forms, buttons, labels, empty states, confirmations, validation, success, and error messages
- [ ] Replace hardcoded UI copy with translation keys while preserving business-created content
- [ ] Validate affected pages compile and existing actions still work

## Acceptance
Core Business Dashboard pages switch between English and Spanish through the shared selector.
Program/customer/reward/business-created names and descriptions remain unchanged.
Existing stamp, reward, QR, and program functionality remain unchanged.