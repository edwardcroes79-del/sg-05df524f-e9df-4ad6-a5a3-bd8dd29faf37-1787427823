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
The live production Issue Stamp flow failed with `function min(uuid) does not exist`. Inspection found the exact invalid SQL in `public.resolve_stamp_issue_location(uuid, uuid, uuid)`: `SELECT count(DISTINCT bul.location_id)::integer, min(bul.location_id)` attempted to aggregate UUID values with `min()`. This resolver is called by both `issue_stamp_tx` overloads and the 2-argument Quick QR token generator before stamps are issued, so the error surfaced during stamp issuance.

The targeted fix replaces `min(bul.location_id)` with a deterministic ordered selection from the assigned location set: order by business location name and UUID text, then limit 1. The function still only returns an inferred location when the staff member has exactly one active assigned location. Requested location IDs are still validated through `user_can_access_business_location`, preserving the Corporate multi-location authorization work. No stamp records, customer ownership, plan settings, or analytics queries were changed.

## Checklist
- [x] Inspect the connected database schema and current stamp/location RPC definitions before changing SQL
- [x] Identify the exact function/query calling `min(uuid)`
- [x] Replace the invalid UUID aggregate with a deterministic UUID-safe selection
- [x] Preserve server-side location resolution and unauthorized location rejection
- [ ] Verify the repaired stamp RPC definitions in the connected environment
- [ ] Run project checks
- [ ] Report root cause, changed database function/file, and production-verification limits

## Acceptance
Corporate staff stamp issuance no longer fails with `function min(uuid) does not exist`.
New staff-issued stamp transactions still record the authorized location_id.
Corporate-wide and location-specific analytics continue using the recorded transaction location.