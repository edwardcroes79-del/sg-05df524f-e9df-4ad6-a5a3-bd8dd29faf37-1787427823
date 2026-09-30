---
title: Final i18n audit and QA
status: done
priority: high
type: chore
tags: [i18n, qa, audit]
created_by: agent
created_at: 2026-09-30T16:49:19Z
position: 94
---

## Notes
Audit the entire Royalty Stamp app for remaining hard-coded English UI text. Checked Customer, Business, Staff, Super Admin, login/register, loyalty cards, rewards, QR, notifications, forms, errors, loading/empty states, and responsive shared surfaces. Mandatory separate audit for What's New: every static title, feature description, NEW badge, button, label, category, and empty state must use i18n keys and switch correctly between English, Spanish, and future languages. Do not translate user/business-created content. Do not change database, RLS, permissions, billing, or functionality. What's New was audited separately in `DashboardLayout.tsx`; static announcement titles, descriptions, badges, modal copy, and buttons route through centralized i18n keys. Super Admin shell, notifications, merchants, payments, customer delete confirmations, contract notices, and security areas were converted to translation keys; business/customer-created and persisted content remains untranslated. Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Audit What's New separately for remaining hard-coded English and future-language readiness
- [x] Audit auth/login/register/reset/update password surfaces for hard-coded UI text
- [x] Audit customer dashboard, loyalty cards, rewards, activity, profile, settings, PWA prompt, and mobile navigation
- [x] Audit business dashboard pages, forms, notifications, errors, loading states, empty states, and responsive shell
- [x] Audit Super Admin surfaces for hard-coded UI text
- [x] Convert remaining static UI strings to centralized i18n keys only
- [x] Preserve business-created/customer-created/database content unchanged
- [x] Run project validation

## Acceptance
Language switching covers audited static UI text across customer, business, staff, auth, and Super Admin surfaces.
What's New contains no hard-coded English UI strings and is ready for future languages via keys.
Existing database, RLS, permissions, billing, auth, QR, stamp, reward, and layout functionality remains unchanged.