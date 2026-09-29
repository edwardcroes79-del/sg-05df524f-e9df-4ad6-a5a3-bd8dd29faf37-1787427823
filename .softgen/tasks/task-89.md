---
title: Phase 3 - PWA Production QA
status: in_progress
priority: high
type: chore
tags: [pwa, qa, customer]
created_by: agent
created_at: 2026-09-29T16:20:00Z
position: 89
---

## Notes
Audit the Customer PWA configuration created in Phases 1 and 2. Ensure manifest loads correctly, app name is "Royalty Stamp", `/public/PWA_logo.png` is properly mapped with valid size declarations, `standalone` mode is set, `start_url` points to the Customer Dashboard (`/customer`), the production domain is used implicitly, the service worker registers cleanly, and no duplicate PWA systems exist. Ensure the installation prompt works correctly on supported platforms. Fix only PWA-related issues. Do not alter business, billing, or loyalty logic, and do not replace `PWA_logo.png`.

## Checklist
- [x] Inspect `public/manifest.json` for correct name, start_url, and icon mapping
- [x] Inspect `public/sw.js` for valid caching and fetch handling
- [x] Inspect `src/pages/_document.tsx` for correct meta tags (theme-color, apple-touch-icon)
- [x] Inspect `src/pages/_app.tsx` for clean service worker registration
- [x] Ensure no duplicate manifest or service worker files exist in the tree
- [ ] Run project validation (check_for_errors)

## Acceptance
The Customer PWA passes QA. The manifest is completely valid, `start_url` routes to `/customer`, and icons properly reference `PWA_logo.png`. No duplicate systems exist.