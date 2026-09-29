---
title: Add-on request payment amount display
status: in_progress
priority: high
type: bug
tags: [billing, addons, payments, notifications]
created_by: agent
created_at: 2026-09-29T00:12:01Z
position: 85
---

## Notes
Debug and fix the add-on request flow where an add-on priced at AWG 10 is correctly included in the subscription total but the confirmation/notification says the pending payment was created for AWG 0.00. Trace add-on price, request handler, subscription total calculation, pending payment creation, and notification message. Use persisted pricing data as source of truth. Do not hard-code AWG 10, do not change configured add-on prices, do not create duplicate pricing calculations, and do not modify unrelated billing, plans, subscriptions, or payment logic.

## Checklist
- [ ] Inspect add-on request UI and API handler
- [ ] Inspect subscription total calculation source currently working
- [ ] Inspect pending payment and notification message amount source
- [ ] Apply smallest fix so displayed amount uses the full new monthly subscription total from persisted pricing
- [ ] Verify AWG 65 plan + AWG 10 add-on displays AWG 75.00
- [ ] Verify another add-on price displays dynamically
- [ ] Run project validation

## Acceptance
Pending payment/notification message displays the correct full new monthly subscription total including base plan and active add-ons.
The existing working subscription total calculation remains preserved.
No unrelated billing, plans, subscriptions, RLS, authentication, or payment-provider logic is changed.