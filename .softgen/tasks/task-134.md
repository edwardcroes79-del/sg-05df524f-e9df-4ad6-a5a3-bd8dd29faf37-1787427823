---
title: Corporate security accuracy stress audit
status: done
priority: urgent
type: chore
tags: [corporate-plan, audit, security, analytics, regression]
created_by: agent
created_at: 2026-10-07T13:58:38Z
position: 134
---

## Notes
Perform Phase 4 final production audit for the Corporate multi-location system and Advanced Analytics. Trial, Starter, Business, and Professional must retain exactly their prior features, limits, pricing, add-ons, Quick QR behavior, permissions, customer behavior, loyalty behavior, billing behavior, and dashboard behavior. Any unintended non-Corporate regression is a release blocker.

Final audit report:
- `.softgen/corporate-plan-phase-4-audit.md`

Result:
- NOT READY.
- No lower-plan regression was found in the audited plan, entitlement, or Quick QR add-on evidence.
- Corporate entitlement isolation is correct: Corporate has Advanced Analytics and Quick QR; lower plans do not have Corporate Advanced Analytics or plan-level Quick QR.
- Release blockers remain because the live Corporate business currently has 0 locations, 0 location assignments, 0 location-attributed stamps/rewards/redemptions, 0 location-attributed Quick QR tokens, and 0 supported location/staff-location audit log entries.
- Required Phase 4 multi-location, customer journey, location-specific Quick QR, location attribution, audit, and full location analytics accuracy tests cannot truthfully pass without real Corporate location/activity data.
- API/schema mismatches discovered during audit were fixed in `src/pages/api/business/locations.ts` and `src/pages/api/staff/locations.ts`.
- Missing non-behavioral analytics indexes were added/verified.

Evidence:
- Corporate businesses: 1
- Corporate locations: 0
- Corporate active locations: 0
- Corporate staff memberships: 3
- Corporate location assignments: 0
- Corporate programs: 7
- Corporate customer cards: 15
- Location-attributed stamps: 0
- Location-attributed rewards earned: 0
- Location-attributed rewards redeemed: 0
- Quick QR tokens with location: 0
- Location audit actions: 0
- Staff-location audit actions: 0

## Checklist
- [x] Capture live schema, RLS, plans, entitlements, indexes, and Corporate data availability
- [x] Verify lower-plan pricing, limits, add-ons, Quick QR behavior, and Corporate-only entitlements
- [x] Audit Corporate location access, staff-location assignment, default location, and location lifecycle security
- [x] Audit location attribution for QR, Quick QR, stamps, rewards, redemptions, and customer activity
- [x] Compare Advanced Analytics metrics against direct database aggregates
- [x] Run performance and query-plan checks for Corporate-scale analytics paths
- [x] Verify unauthorized access is rejected server-side
- [x] Verify audit logs for supported location/staff/permission/admin loyalty actions
- [x] Fix any release-blocking regression discovered, then retest
- [x] Write final Phase 4 readiness report and stop

## Acceptance
The final report lists issues found, root causes, fixes made if any, security results, analytics accuracy, performance results, regression results, and Corporate readiness.
READY is reported only if all critical tests pass.
No lower-plan behavior is changed.