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
- Screenshot analysis: in IMAGE 2 the card box itself is wider than the viewport (5th stamp column, stamp counter, and description text clipped on the right) while text size is identical to IMAGE 1, so this is a container-width blowout, not zoom or spacing.
- Hypothesis: the mobile card list in `src/pages/customer/cards.tsx` is a single implicit-column CSS grid (`grid gap-8 max-w-md mx-auto`, no mobile `grid-cols-*`). Implicit `auto` tracks size to the widest min-content of ANY card; the reward title uses `truncate` (white-space: nowrap) and descriptions use `break-words` (does not reduce min-content), so one card with a long title/token forces every card wider than the viewport.
- Evidence being gathered: git diff of all customer-facing/shared styling files since `49b01c6`, and live card text lengths for customers holding the Arugas card.
- Inspect `src/components/customer/PWAInstallPrompt.tsx` (done: no horizontal width expansion).
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