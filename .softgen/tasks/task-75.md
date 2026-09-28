---
title: Business Contract Renewal Management
status: done
priority: urgent
type: feature
tags: [contracts, renewal, admin, access-control]
created_by: agent
created_at: 2026-09-28T11:32:47Z
position: 75
---

## Notes
Built Phase 3 contract renewal management using the Phase 1 contract fields and Phase 2 expiration/access logic. Super Admin can renew an assigned business contract for 6 or 12 months from the Merchants & Subscriptions screen. If renewed before expiration, the new end date extends from the stored contract end date. If renewed after expiration, the new contract starts from the actual renewal date. Renewal sets `contract_status` back to active, updates contract term/start/end/renewal dates, preserves business status, plan, billing, add-ons, customers, stamps, rewards, programs, branding, and history, and restores Business Admin/Staff access through the existing server-side contract access checks. Renewal activity is recorded in `audit_logs` with previous end date, renewal date, term, renewal mode, new start date, new end date, and next renewal date. Manual suspension remains separate from contract expiration. Super Admin management access remains unchanged. Targeted checks confirmed early 6-month renewal, early 12-month renewal, expired renewal from the actual renewal date, audit history insertion, active renewed access, expired renewed access restoration, and clean project validation.

## Checklist
- [x] Inspect existing contract fields and Super Admin merchant screen
- [x] Add Super Admin Renew Contract action for assigned contracts
- [x] Support 6-month renewals
- [x] Support 12-month renewals
- [x] Extend early renewals from the stored contract end date
- [x] Start post-expiration renewals from the actual renewal date
- [x] Set renewed contracts to active and restore access through existing enforcement
- [x] Preserve existing business data, status, customers, rewards, stamps, programs, branding, plans, billing, and add-ons
- [x] Record renewal history in the existing audit architecture
- [x] Verify early renewal, expired renewal, 6-month renewal, 12-month renewal, restored access, and clean validation

## Acceptance
Super Admin can renew assigned contracts for 6 or 12 months.
Early renewals extend from the existing stored contract end date, while expired renewals start from the actual renewal date.
Renewed contracts restore Business Admin and Staff access without deleting or resetting existing data.