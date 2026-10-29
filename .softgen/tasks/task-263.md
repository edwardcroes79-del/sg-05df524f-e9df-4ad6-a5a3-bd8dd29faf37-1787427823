---
title: Remove industry labels from loyalty card preview
status: done
priority: medium
type: chore
tags: [ui, loyalty-card, design-customizer]
created_by: agent
created_at: 2026-10-29T14:15:29Z
position: 263
---

## Notes
The user wants to remove the industry name or category badge (e.g., "DINING") from the customer loyalty card preview in the Card Design & Template Customizer. Industry presets should remain available as starting points, but the customer-facing card should not force an industry identity label on the business.

## Checklist
- [x] Locate the `LoyaltyCard` component responsible for rendering the customer card preview.
- [x] Identify where the industry/category badge is rendered (e.g., "DINING").
- [x] Remove the badge from the JSX rendering logic.
- [x] Ensure template selection and customization still function properly without displaying the badge.
- [x] Run checks to verify no unintended side effects were introduced.

## Acceptance
- Selecting an industry preset like Restaurant no longer displays an industry badge on the card preview.
- Template names and filters remain visible in the editor.
- The card layout remains clean and fully customizable.