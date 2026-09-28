---
title: Business Contract Expiration Enforcement
status: in_progress
priority: urgent
type: feature
tags: [contracts, expiration, access-control, dashboard]
created_by: agent
created_at: 2026-09-28T11:20:58Z
position: 74
---

## Notes
Implement Phase 2 contract expiration using the Phase 1 contract fields. When the current date/time reaches the assigned contract end date/time, the contract must become expired. Expired businesses and their staff must lose access to the Business Admin Panel through server-side enforcement, not only hidden UI. Super Admin must retain full management access. Contract expiration must remain separate from manual suspended business status and must not delete or modify customers, stamps, rewards, loyalty programs, QR codes, branding, images, history, subscriptions, plans, billing, add-ons, RLS, or unrelated authentication. Existing businesses without assigned contracts must remain accessible according to their existing status and must not suddenly expire.

## Checklist
- [ ] Inspect existing dashboard/business/staff authorization and API access paths
- [ ] Inspect Phase 1 contract fields and status semantics
- [ ] Add server-side contract expiration helper/RPC or database enforcement that updates assigned expired contracts only
- [ ] Enforce expired-contract access denial for Business Owner and Staff dashboard/API access
- [ ] Show expired-contract message to Business Admin/Staff
- [ ] Preserve Super Admin management access to expired businesses
- [ ] Keep manual suspended status separate from contract expired status
- [ ] Verify businesses without assigned contracts do not expire
- [ ] Test active, expired, suspended, Business Admin, and Staff access
- [ ] Run project validation

## Acceptance
Assigned contracts become expired when their end date/time has passed.
Expired-contract businesses and staff cannot access Business Admin Panel routes or APIs.
Super Admin can still manage expired-contract businesses, and unassigned businesses are not expired automatically.