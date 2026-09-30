---
title: Spanish dashboard core pages
status: in_progress
priority: high
type: feature
tags: [i18n, spanish, dashboard-pages]
created_by: agent
created_at: 2026-09-30T16:27:54Z
position: 92
---

## Notes
Translate Business Dashboard core pages using the existing centralized i18n system. English remains default. Use translation keys only. Do not translate business-created content such as customer names, loyalty program names, descriptions, reward titles, customer notes, or persisted values. Preserve page behavior, queries, mutations, realtime refresh, QR/token logic, stamp logic, reward logic, billing logic, auth, permissions, and RLS.

## Checklist
- [x] Inspect dashboard overview, customers, loyalty programs, stamps/rewards, QR, and Quick Issue Stamp pages
- [x] Convert Overview page shared UI, contract information, metrics labels, empty states, and dialogs to translation keys
- [x] Convert Loyalty Programs list page labels, buttons, toasts, badges, and empty states to translation keys
- [x] Convert Customers page labels, search, empty states, dialogs, confirmations, and reward messages to translation keys
- [x] Convert Stamps & Rewards scan page labels, modes, validation, confirmations, scanner states, and toasts to translation keys
- [x] Convert QR Codes page labels, buttons, empty states, and toasts to translation keys
- [x] Convert Quick Issue Stamp page labels, guidance, alerts, validation rules, countdown controls, and toasts to translation keys
- [ ] Run project validation

## Acceptance
Core Business Dashboard pages switch between English and Spanish using the shared selector.
Business-created names, descriptions, reward titles, and customer names remain untranslated.
Existing stamp, reward, QR, and program functionality remains unchanged.