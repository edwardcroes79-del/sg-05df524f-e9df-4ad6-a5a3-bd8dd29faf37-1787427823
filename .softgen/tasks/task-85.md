---
title: Add-on request payment amount display
status: done
priority: high
type: bug
tags: [billing, addons, payments, notifications]
created_by: agent
created_at: 2026-09-29T00:12:01Z
position: 85
---

## Notes
Debugged and fixed the add-on request flow where an add-on priced at AWG 10 was correctly included in the subscription total but the confirmation/notification said the pending payment was created for AWG 0.00. Root cause found: `src/pages/dashboard/billing.tsx` displayed the toast amount from `result.addonPayments?.[0]?.amount`, while `src/pages/api/business/addons.ts` intentionally filters subscription-change/add-on purchase payments out of `addonPayments` for the "Other subscription payment history" list. The API already calculates and persists the correct full new monthly subscription total in `business_addon_subscriptions.metadata.requested_new_monthly_total`. The fix returns that newly persisted request metadata from the API and uses it as the toast amount source. This preserves the existing subscription total calculation and does not hard-code add-on prices. Persisted pricing verification confirmed AWG 65 Business plan + AWG 10 add-ons display AWG 75.00, and other active add-on prices are dynamic: AWG 5 → AWG 70.00, AWG 20 → AWG 85.00, and AWG 30 → AWG 95.00. Project validation passed.

Changed files:
- `src/pages/api/business/addons.ts`: returns the newly created add-on request metadata and `requestedNewMonthlyTotal`.
- `src/pages/dashboard/billing.tsx`: uses the returned persisted request total as the toast amount source.
- `.softgen/tasks/task-85.md`: recorded root cause, verification, and completion.

## Checklist
- [x] Inspect add-on request UI and API handler
- [x] Inspect subscription total calculation source currently working
- [x] Inspect pending payment and notification message amount source
- [x] Apply smallest fix so displayed amount uses the full new monthly subscription total from persisted pricing
- [x] Verify AWG 65 plan + AWG 10 add-on displays AWG 75.00
- [x] Verify another add-on price displays dynamically
- [x] Run project validation

## Acceptance
Pending payment/notification message displays the correct full new monthly subscription total including base plan and active add-ons.
The existing working subscription total calculation remains preserved.
No unrelated billing, plans, subscriptions, RLS, authentication, or payment-provider logic is changed.