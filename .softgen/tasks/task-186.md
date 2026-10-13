---
title: Corporate Location Deletion Failure
status: in_progress
priority: urgent
type: bug
tags: [locations, deletion, api, safety]
created_by: agent
created_at: 2026-10-13T18:34:58Z
position: 186
---

## Notes
Investigate and fix the urgent failure where clicking Delete permanently for location Santa Cruz shows “Location deletion blocked” with the generic message “Failed to manage Corporate locations.” Scope: trace frontend Delete Location button, API handler, backend authorization, database dependency checks, delete operation, and Supabase table/column access. Must capture the actual server/database error before changing behavior. Preserve all safety checks: do not silently cascade-delete stamps, rewards, customers, staff assignments, subscriptions, or business records. If dependencies exist, return a clear blocker reason. If no protected dependencies exist and the user is authorized, allow deletion. Keep active-location cleanup/list refresh. Restrict deletion to authorized business locations. Do not bypass subscription/location-management authorization, disable RLS, delete production locations during testing, run destructive migrations, or deploy.

## Checklist
- [ ] Trace frontend delete flow and backend `/api/business/locations` DELETE handler
- [ ] Capture the actual server/database error behind the generic “Failed to manage Corporate locations” response
- [ ] Identify whether the failure is caused by dependency queries, missing tables/columns, authorization, payload, RLS, permissions, or real protected records
- [ ] Apply the smallest safe fix while preserving dependency blocking and business isolation
- [ ] Verify eligible unused locations can be deleted and dependent locations return clear blocker details
- [ ] Run static checks and report actual error, root cause, files changed, migrations, and manual test results

## Acceptance
Authorized owners can permanently delete an unused location that belongs to their business. Locations with protected dependencies are not deleted and return an accurate reason. Failed operations leave data intact, and active-location/list state refreshes correctly after success.