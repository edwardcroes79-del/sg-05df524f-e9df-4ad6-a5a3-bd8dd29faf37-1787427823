---
title: Spanish Business Dashboard shell
status: in_progress
priority: high
type: feature
tags: [i18n, spanish, dashboard]
created_by: agent
created_at: 2026-09-30T16:27:53Z
position: 91
---

## Notes
Translate the Business Dashboard shared shell using the existing centralized i18n system. English remains default. Use translation keys only. Do not translate business-created content such as business names, customer names, loyalty program names, reward titles, descriptions, or persisted database values. Preserve dashboard functionality, navigation behavior, unread What's New behavior, animations, auth, RLS, billing, plans, add-ons, QR, stamps, and rewards logic. Dashboard shell navigation and shared status screens were already using translation keys; this pass adds the remaining shell keys for staff stamp notifications, plan badges, mobile language access, What's New announcements, NEW/Coming Soon badges, and the Coming Soon modal.

## Checklist
- [x] Inspect DashboardLayout shared shell and What's New content
- [x] Add missing English and Spanish translation keys for dashboard shell, notifications, What's New, modal text, badges, and status labels
- [x] Replace hardcoded dashboard shell strings with translation keys
- [ ] Validate desktop and mobile dashboard shell behavior

## Acceptance
Business Dashboard navigation, menus, What's New, status screens, shell buttons, and shared notifications switch between English and Spanish.
Business-created content remains untranslated.
Existing dashboard functionality and unread/new-item behavior remain unchanged.