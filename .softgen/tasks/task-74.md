---
title: Business Contract Expiration Enforcement
status: done
priority: urgent
type: feature
tags: [contracts, expiration, access-control, dashboard]
created_by: agent
created_at: 2026-09-28T11:22:48Z
position: 74
---

## Notes
Built Phase 2 contract expiration enforcement using the Phase 1 contract fields. Added database-side expiration refresh/access helpers, blocked expired-contract Business Admin and Staff dashboard access through server-backed access status checks, and added explicit expired-contract guards to service-role-backed Business/Staff API routes so direct URLs/API calls cannot bypass the lockout. Expired contracts remain separate from manually suspended businesses. Super Admin management access remains available. No customers, stamps, rewards, loyalty programs, QR codes, branding, images, history, subscriptions, plans, billing, add-ons, unrelated auth architecture, or RLS architecture were deleted or reset. Existing businesses without assigned contracts remain unexpired.

## Checklist
- [x] Inspect dashboard access and Business/Staff authorization paths
- [x] Add automatic expired contract status refresh using stored contract end dates
- [x] Enforce expired-contract denial through database access helpers
- [x] Show Business Admin and Staff the required expired-contract message
- [x] Preserve Super Admin access to expired-contract businesses
- [x] Keep expired contracts separate from manually suspended businesses
- [x] Prevent direct service-role-backed Business/Staff API bypass
- [x] Verify active, expired, suspended, Business Admin, Staff, Super Admin, and unassigned-contract cases
- [x] Run project validation

## Acceptance
Expired-contract Business Admin and Staff users cannot access the Business Admin Panel or protected business/staff APIs.
The expired-contract message says: "Your Royalty Stamp contract has expired. Please contact Royalty Stamp to renew."
Super Admin can still manage expired-contract businesses, and unassigned businesses are not expired automatically.