---
title: Corporate stamp RPC ambiguity
status: in_progress
priority: urgent
type: bug
tags: [corporate, stamps, rpc, database]
created_by: agent
created_at: 2026-10-08T17:06:14Z
position: 158
---

## Notes
Fix PostgreSQL RPC ambiguity when issuing a stamp from a Corporate business: `function public.issue_stamp_core(uuid, uuid, uuid, unknown) is not unique`. First audit all existing `public.issue_stamp_core` functions, signatures, definitions, security mode, search path, and grants. Then trace the current application call and identify what the four arguments represent. Do not create another overloaded function. Preserve existing stamp issuance behavior, business isolation, staff permissions, corporate location-aware activity, history, analytics, lower-plan issuance, and Quick QR issuance.

## Checklist
- [ ] Audit all `public.issue_stamp_core` functions and report exact signatures, return types, definitions, security mode, search path, and permissions
- [ ] Trace all application callers of `issue_stamp_core` and identify the exact argument meanings and types
- [ ] Identify the duplicate or overlapping signatures causing `issue_stamp_core(uuid, uuid, uuid, unknown)` ambiguity
- [ ] Choose the canonical existing stamp issuance path without changing loyalty calculations or creating another duplicate function
- [ ] Apply the smallest safe fix: remove/rename only confirmed obsolete duplicate functions or make callers unambiguous
- [ ] Verify Corporate Admin stamp issuance records the correct customer, program, business, location, and single transaction
- [ ] Verify non-Corporate stamp issuance, Staff issuance, and Quick QR issuance remain working
- [ ] Run project checks and report exact database/app changes and security impact

## Acceptance
Corporate stamp issuance no longer errors with ambiguous `issue_stamp_core`.
Exactly one stamp transaction is created with the correct Corporate location.
Lower-plan and Quick QR stamp issuance remain unchanged.