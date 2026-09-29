---
title: Phase 2 - Customer PWA Install
status: done
priority: high
type: feature
tags: [pwa, customer, ui]
created_by: agent
created_at: 2026-09-29T16:15:00Z
position: 88
---

## Notes
Add a customer-facing PWA installation experience to the Customer Dashboard. Show "📱 Add Royalty Stamp to Home Screen" with "Get faster access to your loyalty cards." Use native PWA install prompt for supported Android browsers, and clear instructions (Share -> Add to Home Screen -> Add) for iOS Safari. Prevent showing again if installed or dismissed. Use existing PWA config (`/public/PWA_logo.png`). Do not modify auth or loyalty functionality.

## Checklist
- [x] Create `PWAInstallPrompt` component
- [x] Detect native PWA `beforeinstallprompt` (Android/Desktop)
- [x] Detect iOS Safari for manual instructions
- [x] Implement local storage dismissal tracking and standalone mode detection
- [x] Add the prompt to `CustomerLayout.tsx`
- [x] Verify styling and responsive behavior
- [x] Test project for errors

## Acceptance
Prompt shows up for eligible browsers. Android triggers native prompt. iOS shows manual instruction steps. Does not show if already installed or dismissed. Customer auth and loyalty logic remain unchanged.