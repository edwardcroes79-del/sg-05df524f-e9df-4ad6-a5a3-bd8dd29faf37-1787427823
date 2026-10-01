---
title: Aruban Papiamento final audit
status: in_progress
priority: high
type: chore
tags: [i18n, papiamento, aruba, qa]
created_by: agent
created_at: 2026-10-01T00:21:45Z
position: 97
---

## Notes
Perform a strict final audit of all existing Papiamento translations using https://papiamento.aw as the primary reference for Aruban Papiamento vocabulary, spelling, and terminology. The live reference fetch returned a Cloudflare verification page instead of readable vocabulary content, so direct citation from that source is blocked in this sandbox. Required language remains authentic Aruban Papiamento, not the non-Aruban variant. Review every Papiamento translation key created in Phase 2 and correct incorrect vocabulary, spelling, or terminology. Use “Papiamento” everywhere. Check Customer, Business, Staff, Super Admin, login/register, navigation, loyalty cards, rewards, QR, billing, add-ons, settings, notifications, forms, errors, modals, and empty states. Mandatory separate What’s New audit: verify every title, description, NEW badge, button, label, and empty state uses correct Aruban Papiamento. Test Papiamento ↔ English ↔ Spanish, refresh/login persistence, and responsive mobile/tablet/desktop behavior. Do not change database, RLS, permissions, billing, or existing functionality.

## Checklist
- [x] Fetch and attempt to use papiamento.aw as the primary Aruban Papiamento reference
- [x] Inspect existing Papiamento i18n catalog and language selector/provider
- [x] Audit What’s New separately for correct Aruban Papiamento static text
- [x] Correct Papiamento vocabulary, spelling, and terminology across customer/auth/dashboard/admin keys
- [x] Verify “Papiamento” is used and the non-Aruban language-name variant is absent
- [x] Preserve user/business/customer-created and database content unchanged
- [ ] Run project validation

## Acceptance
Papiamento UI text uses authentic Aruban Papiamento according to the reference audit.
What’s New is separately audited and corrected through translation keys.
English, Spanish, language persistence, and existing functionality remain unchanged.