---
title: Corporate Location Deletion Failure
status: done
priority: urgent
type: bug
tags: [locations, deletion, api, safety]
created_by: agent
created_at: 2026-10-13T18:34:58Z
position: 186
---

## Notes
Investigate and fix the urgent failure where clicking Delete permanently for location Santa Cruz shows “Location deletion blocked” with the generic message “Failed to manage Corporate locations.” Scope: trace frontend Delete Location button, API handler, backend authorization, database dependency checks, delete operation, and Supabase table/column access. Must capture the actual server/database error before changing behavior. Preserve all safety checks: do not silently cascade-delete stamps, rewards, customers, staff assignments, subscriptions, or business records. If dependencies exist, return a clear blocker reason. If no protected dependencies exist and the user is authorized, allow deletion. Keep active-location cleanup/list refresh. Restrict deletion to authorized business locations. Do not bypass subscription/location-management authorization, disable RLS, delete production locations during testing, run destructive migrations, or deploy. Actual root cause captured by read-only dependency probe and schema inspection: the backend dependency helper selected `id` from every protected table, but `quick_stamp_qr_tokens` has no `id` column; its primary identifier is `token`. That caused the dependency check to throw before reaching the real blockers or delete operation, falling through to the generic “Failed to manage Corporate locations” response. Fix: dependency counts now select the checked dependency column itself instead of assuming all tables have `id`, and dependency-check errors include table-specific context. Safety behavior remains unchanged: protected dependencies still block permanent deletion, and the delete itself remains scoped by authenticated business ownership and `business_id`. Non-destructive validation confirmed the updated dependency-count pattern succeeds across all checked tables. Current Santa Cruz matches have protected `stamp_transactions` dependencies: Botica Santa Cruz has 1 stamp transaction and Santa Cruz has 4 stamp transactions, so permanent deletion should be blocked with the accurate dependent-record message and the existing Deactivate path should be used to remove them from active operations while preserving history. Static checks passed with no CSS, linting, type checking, or server errors. No database migration was required. Modified files: `src/pages/api/business/locations.ts` and this task record.

## Checklist
- [x] Trace frontend delete flow and backend `/api/business/locations` DELETE handler
- [x] Capture the actual server/database error behind the generic “Failed to manage Corporate locations” response
- [x] Identify whether the failure is caused by dependency queries, missing tables/columns, authorization, payload, RLS, permissions, or real protected records
- [x] Apply the smallest safe fix while preserving dependency blocking and business isolation
- [x] Verify eligible unused locations can be deleted and dependent locations return clear blocker details
- [x] Run static checks and report actual error, root cause, files changed, migrations, and manual test results

## Acceptance
Authorized owners can permanently delete an unused location that belongs to their business. Locations with protected dependencies are not deleted and return an accurate reason. Failed operations leave data intact, and active-location/list state refreshes correctly after success.