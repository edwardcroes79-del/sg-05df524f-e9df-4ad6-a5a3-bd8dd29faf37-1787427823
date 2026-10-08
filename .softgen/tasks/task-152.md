---
title: Corporate Branding Settings UI
status: done
priority: urgent
type: feature
tags: [corporate, branding, frontend, settings]
created_by: agent
created_at: 2026-10-08T14:02:00Z
position: 152
---

## Notes
Build Phase 2: Corporate Branding Settings page using the Phase 1 backend.
Corporate admins can upload logo, select primary/secondary colors, see a live preview, save, and reset.
Protected by Corporate entitlement. Requires i18n (English, Spanish, Papiamento) and responsive UI.

## Checklist
- [x] Audit dashboard settings layout and i18n for branding integration
- [x] Add i18n translation keys for branding settings (EN, ES, PAP)
- [x] Create UI component for Corporate Branding Settings with color pickers, logo upload, and live preview
- [x] Integrate into dashboard routing (e.g., new tab in Settings or separate page)
- [x] Wire up API calls using Phase 1 backend endpoints
- [x] Enforce frontend Corporate entitlement check
- [x] Validate implementation and run project error checks