---
title: What's New multilingual update
status: in_progress
priority: high
type: feature
tags: [i18n, whats-new, multilingual]
created_by: agent
created_at: 2026-10-01T00:28:36Z
position: 98
---

## Notes
Update the existing 🔔 What's New section to fully support English, Spanish, and authentic Aruban Papiamento through the existing i18n translation-key system. Every static What's New title, description, NEW badge/label, button, category label, and empty state must have English, Spanish, and Papiamento translations. Use “Papiamento” everywhere and never the non-Aruban language-name variant. Attempted to use https://papiamento.aw as the primary reference target, but the live fetch returned a Cloudflare verification page instead of readable vocabulary content in this sandbox. Do not translate business-created or customer-created content. Preserve all existing What's New features, unread state, and animations. Do not change unrelated functionality, database, RLS, permissions, or billing. Inspected `DashboardLayout.tsx`: What's New title, feature titles, descriptions, NEW/Coming Soon labels, option labels, modal copy, and modal button all route through the existing `t(...)` translation-key system. The unread state remains `whatsNewRead_v1`, and bell animations remain unchanged.

## Checklist
- [x] Inspect existing What's New rendering and translation-key usage
- [x] Add or correct English, Spanish, and Aruban Papiamento keys for all static What's New text
- [x] Ensure NEW badges/labels, buttons, category labels, and empty states use translation keys
- [x] Preserve unread state and animations
- [ ] Verify Papiamento wording does not use the forbidden language-name variant
- [ ] Run project validation

## Acceptance
What's New displays English, Spanish, and Aruban Papiamento based on the selected app language.
All static What's New titles, descriptions, badges, labels, buttons, categories, and empty states use existing i18n keys.
Existing What's New behavior, unread state, animations, and unrelated functionality remain unchanged.