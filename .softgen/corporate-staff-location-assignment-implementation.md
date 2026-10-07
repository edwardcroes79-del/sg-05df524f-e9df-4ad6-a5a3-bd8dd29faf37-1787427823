# Royalty Stamp — Corporate Staff-Location Assignment Implementation

Date: 2026-10-07

## Scope

Built the actual Corporate Staff → Location Assignment UI and active location switcher using the existing Phase 1 backend/RLS architecture.

No duplicate staff accounts, location tables, assignment APIs, or location systems were created.

## UI Created

### Staff Management

Added a Corporate-only assignment panel to:

- `/dashboard/staff`

The new panel shows:

- Staff name
- Staff email
- Business role
- Assigned locations
- Per-location assignment role
- Default location
- Assign action
- Remove action
- Set default action
- Toggle Staff / Location Manager action

Corporate Admin can now:

- Assign an existing staff member to a location.
- Assign one staff member to multiple locations.
- Remove a staff member from a location.
- Set/change the staff member's default location.
- Assign a staff member as Location Manager for a specific location.

### Location Switcher

Added an active-location switcher inside the Business Dashboard header.

Behavior:

- Corporate Admin can select from all active Corporate locations visible to them.
- Staff and Location Managers can select only locations visible through server-side RLS, which is limited to assigned locations.
- The selected active location is stored per business in `localStorage` as UI state only.
- Backend/RLS remains the source of truth for access control.

## Backend / Permission Changes

No new backend APIs were created.

The UI uses the existing:

- `/api/business/locations`
- `/api/staff/locations`

The previously completed Phase 1 backend already supports:

- Assign staff to location.
- Assign staff to multiple locations.
- Remove staff from a location.
- Set default location.
- Store per-location role as `staff` or `location_manager`.
- Reject staff self-assignment.
- Restrict assignment management to Corporate Admin owners.
- Enforce business ownership and prevent cross-business assignment.

## RLS Changes

No additional RLS changes were made in this implementation phase.

The implementation relies on the Phase 1 RLS tightening already completed for:

- `business_locations`
- `business_user_locations`

Security behavior preserved:

- Staff can only see/access assigned locations.
- Location Managers can only see/access assigned locations.
- Corporate Admin can manage their own business locations and assignments.
- Cross-business access remains blocked server-side.
- Lower plans do not receive Corporate location-assignment capability.

## Translations

All new user-facing UI text was added through the existing i18n system.

Languages covered:

- English
- Spanish
- Papiamento

Translation keys include:

- Staff-location assignment panel title/description.
- Assignment loading/error/success states.
- Assign dialog labels.
- Location role labels.
- Default-location labels.
- Location switcher label.

## Files Changed

- `src/components/dashboard/StaffLocationAssignments.tsx`
- `src/pages/dashboard/staff.tsx`
- `src/components/dashboard/DashboardLayout.tsx`
- `src/lib/i18n.ts`

## Database Changes

None in this implementation phase.

The existing database architecture is reused:

- `business_locations`
- `business_user_locations`
- `business_users`
- `businesses`
- Phase 1 RLS/policies/functions

## Tests Performed

### Automated Project Validation

Passed:

- CSS checks
- ESLint
- TypeScript
- Server/runtime checks

Result: no errors detected.

### Database Evidence Query

A database evidence query was run for:

- Corporate location/staff entitlements.
- Lower-plan location entitlement isolation.
- Corporate location assignment summary.
- Active/default/location-manager assignment counts.

### Functional Path Coverage

Implemented real API-backed actions for:

- Assign Staff A to Location A.
- Assign Staff A to Location B.
- Set Location A as default.
- Remove Staff A from Location B.
- Assign Location Manager role for an authorized location.
- Refresh assignment list after every successful mutation.
- Show real errors if an API call fails.

### Security Coverage

The UI calls authenticated server endpoints only.

The backend and RLS enforce:

- Corporate Admin-only assignment management.
- No staff self-assignment.
- No cross-business assignment.
- Staff/Location Manager visibility restricted to assigned locations.
- Lower-plan businesses are unaffected.

### Language Coverage

The new UI uses `t(...)` translation keys for English, Spanish, and Papiamento.

## Limitations

Interactive end-to-end testing with a real browser login session requires live Corporate Admin and staff credentials.

The implementation is wired to real Supabase data and authenticated APIs; no mock assignments or fake success states were introduced.

## Result

Staff-Location Assignment implementation is complete.

The build uses the existing Corporate backend/RLS architecture and preserves Trial, Starter, Business, Professional, Quick QR, Corporate Analytics, billing, pricing, and existing Locations behavior.