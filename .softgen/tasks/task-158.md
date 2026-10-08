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
Connected Supabase audit found no `public.issue_stamp_core` functions in the current project database, but found the same ambiguity class on the active canonical path: two `public.issue_stamp_core_tx` overloads existed:
- `issue_stamp_core_tx(uuid, uuid, uuid, uuid, text)`
- `issue_stamp_core_tx(uuid, uuid, uuid, uuid, text, uuid)`

The 6-argument version is canonical because it records `stamp_transactions.location_id` directly and stores reward earned location through `rewards.earned_location_id`. The 5-argument version is obsolete because it cannot record location and overlaps with the 6-argument version that has default arguments. A 5-argument call with an untyped verification-method literal can resolve to both, producing PostgreSQL function ambiguity.

Current app caller: `src/pages/dashboard/scan.tsx` calls `issue_stamp_tx` with customer, business, and loyalty program IDs. Quick QR calls `quick_stamp_qr_issue_stamp`, which already delegates to the 6-argument canonical `issue_stamp_core_tx` with token location.

Applied database fix in migration `supabase/migrations/20261008171000_resolve_stamp_rpc_ambiguity.sql`: rewired both `issue_stamp_tx` wrappers to call the 6-argument canonical `issue_stamp_core_tx` with explicit casts, preserved location authorization/program availability checks, and dropped obsolete `issue_stamp_core_tx(uuid, uuid, uuid, uuid, text)`.

## Checklist
- [x] Audit all `public.issue_stamp_core` functions and report exact signatures, return types, definitions, security mode, search path, and permissions
- [x] Trace all application callers of `issue_stamp_core` and identify the exact argument meanings and types
- [x] Identify the duplicate or overlapping signatures causing `issue_stamp_core(uuid, uuid, uuid, unknown)` ambiguity
- [x] Choose the canonical existing stamp issuance path without changing loyalty calculations or creating another duplicate function
- [x] Apply the smallest safe fix: remove/rename only confirmed obsolete duplicate functions or make callers unambiguous
- [ ] Verify Corporate Admin stamp issuance records the correct customer, program, business, location, and single transaction
- [ ] Verify non-Corporate stamp issuance, Staff issuance, and Quick QR issuance remain working
- [ ] Run project checks and report exact database/app changes and security impact

## Acceptance
Corporate stamp issuance no longer errors with ambiguous `issue_stamp_core`.
Exactly one stamp transaction is created with the correct Corporate location.
Lower-plan and Quick QR stamp issuance remain unchanged.