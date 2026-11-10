---
title: Investigate Staff Access to Member Portal
status: in_progress
priority: high
type: bug
tags: [security, auth, authorization, customer, staff]
created_by: agent
created_at: 2026-11-10T13:35:00Z
position: 273
---

## Notes
A user reported that an account registered as Staff can log in to the Customer/Member portal using their existing credentials.
The objective is to investigate the exact reason why Staff can authenticate into the Member portal without completing customer registration.

This is a read-only investigation. No fixes will be implemented without approval.

## Checklist
- [ ] Inspect Member login page (`src/pages/auth/customer.tsx`).
- [ ] Inspect Member protected routes (`src/components/customer/CustomerLayout.tsx`).
- [ ] Check how Supabase Auth treats Staff vs Customer login.
- [ ] Check role/profile resolution logic in the Member portal.
- [ ] Document findings and proposed solution.

## Acceptance
- The root cause is clearly identified.
- Relevant files and logic flaws are listed.
- Recommended minimal correction is provided.
- NO code or database changes made.