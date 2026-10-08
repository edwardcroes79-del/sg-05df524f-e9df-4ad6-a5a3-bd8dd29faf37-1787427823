---
title: Location stamp attribution
status: in_progress
priority: urgent
type: bug
tags: [stamps, corporate, locations, analytics, supabase]
created_by: agent
created_at: 2026-10-08T19:00:24Z
position: 161
---

## Notes
Staff assigned to a Corporate location can issue stamps successfully, and Corporate-wide analytics includes the stamps, but location-specific analytics does not. This indicates the underlying stamp transaction is likely missing or mis-recording `location_id`. The fix must trace the complete issue-stamp flow from UI to server/database function, resolve authorized staff/admin location context server-side, record the correct location on the stamp transaction, preserve historical stamps, keep Corporate-wide aggregation intact, keep lower-plan behavior unchanged, and ensure staff cannot submit unauthorized `location_id` manually. Quick QR location attribution must remain correct.

## Checklist
- [ ] Audit database schema for stamp transaction location storage, staff-location assignment tables, stamp RPCs, and analytics RPCs
- [ ] Trace UI and API callers for staff/admin Issue Stamp, Corporate selected location issuance, and Quick QR issuance
- [ ] Identify where location context is lost or trusted incorrectly
- [ ] Apply the smallest database/function and application fix so new stamp transactions store the authorized location_id
- [ ] Ensure staff cannot manually submit an unauthorized location_id
- [ ] Verify Corporate-wide analytics still aggregates all locations
- [ ] Verify location-specific analytics filters by recorded transaction location
- [ ] Verify Quick QR records the token/location context correctly
- [ ] Run project checks and report root cause, changed files, database objects, security impact, and test coverage

## Acceptance
New staff-issued stamps store the staff member’s authorized location_id in the transaction record.
Corporate Admin selected-location stamps and Quick QR stamps store the intended location_id.
Location-specific analytics includes only stamps for that location while Corporate-wide analytics remains complete.