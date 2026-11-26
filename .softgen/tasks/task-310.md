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
Restore the previous compact customer-facing loyalty card layout so more of the card is visible on mobile without excessive scrolling. Preserve branding, banners, logos, colors, reward details, program description, bottom navigation, and all existing customer/stamping behavior. This is a UI-only change focused on the customer loyalty card presentation.

## Checklist
- [ ] Inspect the current customer loyalty card component, customer cards page spacing, and recent file history for the previous compact layout
- [ ] Reduce mobile vertical spacing, banner height, and internal gaps without changing business branding or card data
- [ ] Keep the stamp grid compact and readable with no horizontal overflow
- [ ] Preserve responsive behavior for mobile and desktop
- [ ] Validate the updated UI with check_for_errors if changes go beyond purely cosmetic scope

## Acceptance
The customer loyalty card fits better on mobile screens with less scrolling while preserving branding and readability.
Bottom navigation and all existing customer navigation behavior remain unchanged.