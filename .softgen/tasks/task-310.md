---
title: Compact customer loyalty card view
status: done
priority: high
type: bug
tags: [customer, loyalty-card, mobile, ui]
created_by: agent
created_at: 2026-11-26T11:31:00Z
position: 310
---
## Notes
Restore the previous compact customer-facing loyalty card layout so more of the card is visible on mobile without excessive scrolling. Preserve branding, banners, logos, colors, reward details, program description, bottom navigation, and all existing customer/stamping behavior. This is a UI-only change focused on the customer loyalty card presentation.

Implemented scope:
- Reduced mobile banner height in `src/components/LoyaltyCard.tsx` without distorting uploaded business images.
- Tightened card padding, header spacing, logo footprint, stamp grid spacing, reward section spacing, and text detail spacing on mobile.
- Kept desktop sizing responsive with larger spacing preserved at `sm` and above.
- Reduced list spacing in `src/pages/customer/cards.tsx` so more of each card fits on mobile while keeping navigation and highlighted-card behavior unchanged.

## Checklist
- [x] Inspect the current customer loyalty card component, customer cards page spacing, and recent file history for the previous compact layout
- [x] Reduce mobile vertical spacing, banner height, and internal gaps without changing business branding or card data
- [x] Keep the stamp grid compact and readable with no horizontal overflow
- [x] Preserve responsive behavior for mobile and desktop
- [x] Validate the updated UI with check_for_errors if changes go beyond purely cosmetic scope

## Acceptance
The customer loyalty card fits better on mobile screens with less scrolling while preserving branding and readability.
Bottom navigation and all existing customer navigation behavior remain unchanged.