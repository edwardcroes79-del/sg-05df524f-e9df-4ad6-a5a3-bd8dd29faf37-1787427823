---
title: Phase 1 - Customer PWA Foundation
status: in_progress
priority: high
type: feature
tags: [pwa, customer, architecture]
created_by: agent
created_at: 2026-09-29T16:01:00Z
position: 87
---

## Notes
Build the Royalty Stamp Customer Dashboard as a proper installable PWA.
App name: Royalty Stamp
Short name: Royalty Stamp
Display: standalone
Start URL: /customer
Theme/Background: Match Aruba Royalty Stamp colors
Icons: Use /public/PWA_logo.png
Manifest & Service Worker implementation to ensure installability.
Domain: https://royaltystamp.com (implicit base)
Do not change authentication, customer data, loyalty logic, or business dashboard.

## Checklist
- [ ] Inspect existing PWA/manifest/service-worker config
- [ ] Create/Update public/manifest.json
- [ ] Create/Update public/sw.js (Service Worker)
- [ ] Register Service Worker in _app.tsx
- [ ] Add manifest and meta tags in _document.tsx
- [ ] Verify PWA_logo.png usage as app icon
- [ ] Run project validation checks

## Acceptance
The customer dashboard is a properly installable PWA with Royalty Stamp branding.
No duplication of existing PWA systems if one was already present.
Existing authentication and loyalty logic remain unchanged.