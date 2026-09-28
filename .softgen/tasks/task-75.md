---
title: Business Contract Renewal Management
status: in_progress
priority: urgent
type: feature
tags: [contracts, renewal, admin, access-control]
created_by: agent
created_at: 2026-09-28T11:31:34Z
position: 75
---

## Notes
Build Phase 3 contract renewal management using the Phase 1 contract fields and Phase 2 expiration enforcement. Super Admin needs a Renew Contract action for 6 or 12 months. If renewed before expiration, extend from the existing contract end date. If renewed after expiration, start from the actual renewal date. Renewal must set contract status active, restore Business Admin and Staff access via existing access logic, preserve all existing business/customer/program/stamp/reward/branding/history data, keep contract expiration separate from manual suspension, and avoid changing plans, billing, add-ons, RLS, or authentication architecture. Record renewal information/history where the existing architecture supports it.

## Checklist
- [ ] Inspect existing contract fields, Super Admin merchant UI, and expiration access helpers
- [ ] Add renewal history storage if no suitable existing history structure exists
- [ ] Add Super Admin Renew Contract action for 6-month and 12-month terms
- [ ] Calculate early renewal from existing contract end date using calendar months
- [ ] Calculate expired renewal from the actual renewal date using calendar months
- [ ] Set renewed contracts to active without changing manual business suspension state
- [ ] Preserve all existing business data, subscriptions, add-ons, auth, and RLS architecture
- [ ] Verify early renewal, expired renewal, 6-month renewal, and 12-month renewal
- [ ] Run project validation

## Acceptance
Super Admin can renew a contract for 6 or 12 months from the merchant screen.
Early renewals extend from the stored contract end date, while expired renewals start from the actual renewal date.
Renewed expired contracts restore Business Admin and Staff access without deleting or resetting existing data.