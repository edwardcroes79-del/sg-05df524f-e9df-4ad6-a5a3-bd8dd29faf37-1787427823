# Royalty Stamp — Corporate Staff Location Assignment
# Phase 1: Audit + Backend

Date: 2026-10-07

## Result

Phase 1 backend audit and implementation is complete.

No UI was built in this phase.

## Existing Staff/Location Architecture Found

The existing Corporate multi-location backend already had the core relationship architecture:

- `business_locations`
  - Corporate business locations.
  - Includes business scoping, status, slug, address/contact fields, and lifecycle fields.
- `business_user_locations`
  - Staff-to-location assignment table.
  - Supports one staff account assigned to one or multiple locations.
  - Supports `is_default` for a default/active staff location.
  - Supports assignment status and removal timestamps.
  - Has a unique assignment constraint on `(business_user_id, location_id)`, preventing duplicate assignment rows for the same staff/location pair.
  - Has a partial unique default index so one active default location exists per staff member.
- `business_users`
  - Existing staff membership relationship for a business.
  - Staff accounts are linked here; no duplicate staff accounts are needed for multiple locations.
- Existing Corporate location APIs:
  - `src/pages/api/business/locations.ts`
  - `src/pages/api/staff/locations.ts`

## Whether Relationship Already Existed

Yes.

The `business_user_locations` relationship already existed and was the correct architecture for:

- Assign staff to one location.
- Assign staff to multiple locations.
- Remove staff from a location by marking assignment inactive.
- Set one default/active location.
- Preserve one staff account across multiple locations.
- Preserve historical activity because stamp/reward/QR activity stores nullable location attribution separately and assignments are not hard-deleted.

## Gaps Found

Two backend/security gaps were found:

1. `src/pages/api/staff/locations.ts` accepted assignments, removals, and default-location changes, but it did not support explicitly assigning the per-location assignment role as `location_manager`.
2. Existing RLS SELECT policies for `business_locations` and `business_user_locations` were too broad for active business members:
   - An active business member could potentially select more Corporate locations than their assigned locations.
   - Assignment visibility needed to be narrowed so Staff/Location Managers only see their own assignments unless they are Corporate Admin or Super Admin.

## Fixes Made

### API Permission/Role Support

Changed:

- `src/pages/api/staff/locations.ts`

Added:

- `role?: "location_manager" | "staff"` to staff-location assignment payloads.
- Role sanitization via `sanitizeAssignmentRole`.
- POST assignment support for:
  - `staff`
  - `location_manager`
- PATCH assignment support to update role between:
  - `staff`
  - `location_manager`
- Existing Corporate Admin-only management remains enforced through `requireCorporateAdmin`.
- Existing multi-location assignment behavior is preserved.
- Existing default-location behavior is preserved.
- Existing removal behavior is preserved by marking assignment inactive and setting `removed_at`.

### RLS Policy Tightening

Changed live Supabase policies:

- `business_locations_select_access`
- `business_user_locations_select_access`

New behavior:

- Super Admin can select relevant rows.
- Corporate Admin can select all locations and staff-location assignments for their own business.
- Staff and Location Managers can select only locations they are actively assigned to.
- Staff and Location Managers can select only their own assignment rows.
- Cross-business selection remains rejected by business-scoped policy predicates.

## Database Changes

Database schema/table structure was not duplicated.

No duplicate staff-location system was created.

The following database/security changes were applied:

- Replaced SELECT policy on `public.business_locations`.
- Replaced SELECT policy on `public.business_user_locations`.

No lower-plan pricing, limits, billing, Quick QR behavior, Corporate Analytics behavior, or existing Locations functionality was changed.

A Supabase migration was recorded for the policy changes.

## RLS/Security Changes

Security after the fix:

- Corporate Admin:
  - Can manage staff-location assignments only for their own Corporate business.
  - Can assign staff to one or many locations.
  - Can assign Location Manager role at the location assignment level.
  - Can remove staff from a location.
  - Can set default/active location.
- Staff:
  - Cannot assign themselves to locations.
  - Cannot manage staff-location assignments.
  - Can only see assigned locations through RLS.
- Location Manager:
  - Must be assigned to specific locations.
  - Can only see assigned locations through RLS.
- Cross-business:
  - API validates target business, staff record, and location all belong to the same business.
  - RLS policies include business-scoped checks.
  - One business cannot manage or select another business’s locations through these paths.
- Historical activity:
  - Assignment removals mark records inactive instead of hard-deleting related activity.
  - Existing location attribution on stamp/reward/QR activity remains intact.

## Permission Changes

Permission behavior changed only for Corporate staff-location backend assignment support:

- Added per-assignment role support for `location_manager`.
- Tightened RLS read access for assigned-location visibility.

No lower-plan permissions were expanded.

No Corporate Analytics permissions were changed.

No existing Quick QR behavior was changed.

## Files Changed

- `src/pages/api/staff/locations.ts`
- `.softgen/tasks/task-136.md`
- `.softgen/corporate-staff-location-assignment-phase-1-audit.md`

Database/RLS changes were applied through Supabase SQL migration.

## Test Results

Validation performed:

- Live schema inspected for:
  - staff/users
  - businesses
  - locations
  - staff-location relationships
  - RLS policies
  - indexes
  - permission functions
- Existing staff/location backend code inspected.
- Existing relationship confirmed: `business_user_locations`.
- Assignment constraints verified:
  - unique staff/location assignment index exists.
  - one active default assignment per staff index exists.
  - location/business indexes exist for scalable assigned-location queries.
- RLS SELECT policies tightened and migration recorded.
- Project validation passed:
  - no CSS errors
  - no lint errors
  - no TypeScript errors
  - no server errors

## Regression Results

No changes were made to:

- Trial
- Starter
- Business
- Professional
- Existing pricing
- Existing limits
- Existing billing
- Existing Quick QR behavior
- Existing Corporate Analytics
- Existing Corporate Locations UI

## Final Status

Phase 1 backend is complete.

The required backend relationship already existed, and the missing backend support was limited to:

- explicit Location Manager assignment role support in the staff-location API.
- stricter assigned-location RLS visibility.

No UI was built.