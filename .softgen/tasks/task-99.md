---
title: Add New Languages to What's New
status: in_progress
priority: high
type: feature
tags: [whats-new, i18n, languages]
created_by: agent
created_at: 2026-10-01T00:37:41Z
position: 99
---

## Notes
Add a new item to the existing 🔔 What's New section for Business clients announcing the availability of Spanish and Papiamento.
Title: 🌎 New Languages Available. Badge: 🆕 NEW. Use existing i18n translation keys. Display correct version based on user's selected language. Papiamento must follow authentic Aruban Papiamento using papiamento.aw terminology. Use "Papiamento", never "Papiamentu". Preserve existing What's New items, unread state (whatsNewRead_v1), and animations. Do not change unrelated functionality.

## Checklist
- [ ] Add translation keys for the new language announcement to English, Spanish, and Papiamento catalogs
- [ ] Add the new item to the What's New section in `DashboardLayout.tsx`
- [ ] Verify Papiamento wording does not use the forbidden language-name variant
- [ ] Test language switching and run check_for_errors

## Acceptance
The new language announcement appears in the What's New modal, translated correctly into English, Spanish, and Papiamento.
Papiamento text uses authentic Aruban Papiamento.
Existing What's New functionality remains intact.