---
title: Production stamp min uuid fix
status: in_progress
priority: urgent
type: bug
tags: [stamps, production, supabase, locations]
created_by: agent
created_at: 2026-10-08T19:05:02Z
position: 162
---

## Notes
The live production Issue Stamp flow now fails with `function min(uuid) does not exist`. This must be traced from the stamp RPC/database functions, fixed at the SQL source, and kept compatible with the Corporate multi-location attribution work. Do not change pricing, lower-plan behavior, customer ownership, or duplicate stamp records. Preserve server-side location authorization and location-specific analytics behavior.

## Checklist
- [ ] Inspect the connected database schema and current stamp/location RPC definitions before changing SQL
- [ ] Identify the exact function/query calling `min(uuid)`
- [ ] Replace the invalid UUID aggregate with a deterministic UUID-safe selection
- [ ] Preserve server-side location resolution and unauthorized location rejection
- [ ] Verify the repaired stamp RPC definitions in the connected environment
- [ ] Run project checks
- [ ] Report root cause, changed database function/file, and production-verification limits

## Acceptance
Corporate staff stamp issuance no longer fails with `function min(uuid) does not exist`.
New staff-issued stamp transactions still record the authorized location_id.
Corporate-wide and location-specific analytics continue using the recorded transaction location.