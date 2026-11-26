---
title: Compact customer loyalty card view
status: in_progress
priority: high
type: bug
tags: [customer, loyalty-card, mobile, ui]
created_by: agent
created_at: 2026-11-26T11:31:00Z
position: 310
---
## Notes
Restore the exact original customer-facing loyalty card layout from immediately before the Staff Loyalty Card Assignment feature was introduced. Preserve all staff assignment functionality, database authorization, and stamping flows. Match the provided original screenshot as closely as possible by restoring the actual prior implementation rather than approximating with new spacing changes.

Confirmed findings so far:
- `src/components/LoyaltyCard.tsx` already contains the restored original card internals.
- `src/pages/customer/cards.tsx` already contains the restored original card list spacing.
- Git history confirms the compact card regression was reverted in the card files.
- `src/components/customer/CustomerLayout.tsx` does not show a confirmed gutter-width regression in the main shell: the current and earlier git version both use `flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full`.
- The remaining visual mismatch is therefore not yet proven to come from the main customer shell classes.

Active investigation:
- Inspect `src/components/customer/PWAInstallPrompt.tsx`, which is now injected inside the customer layout and may affect mobile framing or viewport width at runtime.
- Verify whether any child inserted by the layout introduces width expansion, clipping, or altered vertical framing.
- Restore only the confirmed source of the customer page presentation regression.

## Checklist
- [x] Inspect the current customer loyalty card component and customer cards page
- [x] Compare the customer card files against the pre-staff-assignment git version
- [x] Inspect the parent customer layout and identify the framing regression
- [ ] Compare the restored code directly against the provided screenshots
- [ ] Restore the exact original customer-facing implementation from immediately before staff assignment
- [ ] Preserve highlighted-card behavior and all customer/staff workflows
- [ ] Validate build/runtime behavior after the restoration

## Acceptance
The customer loyalty card matches the original customer-facing design from before the Staff Loyalty Card Assignment feature work and aligns with the provided original screenshot.
Staff assignment, staff stamping restrictions, and all server-side authorization remain unchanged.