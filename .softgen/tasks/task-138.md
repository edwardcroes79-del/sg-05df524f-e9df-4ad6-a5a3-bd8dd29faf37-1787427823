---
title: Corporate Quick QR menu visibility
status: in_progress
priority: urgent
type: bug
tags: [corporate-plan, quick-qr, navigation, dashboard]
created_by: agent
created_at: 2026-10-07T14:40:54Z
position: 138
---

## Notes
Fix only the missing Quick QR item in the Corporate Business Dashboard navigation. Corporate businesses must see Quick QR automatically and must not require the AWG 10 Quick QR add-on. Lower plans must keep their existing Quick QR add-on behavior unchanged. Use the existing Quick QR route and implementation. Do not create duplicate routes, entitlements, QR systems, or mock UI. Preserve active/selected location architecture and backend/RLS authorization.

## Checklist
- [ ] Inspect Business Dashboard navigation and Quick QR menu filtering logic
- [ ] Inspect Quick QR route and permission checks
- [ ] Inspect Corporate plan identifier and Quick QR entitlement/add-on logic
- [ ] Fix the actual navigation condition so Corporate sees Quick QR while lower plans remain unchanged
- [ ] Ensure new/exposed menu text uses existing i18n for English, Spanish, and Papiamento
- [ ] Validate project checks and record entitlement/menu/route test results

## Acceptance
Corporate Admin visibly sees Quick QR in the Business Dashboard menu.
Quick QR opens the existing Quick QR page and does not require the AWG 10 add-on for Corporate.
Lower-plan Quick QR behavior remains unchanged.