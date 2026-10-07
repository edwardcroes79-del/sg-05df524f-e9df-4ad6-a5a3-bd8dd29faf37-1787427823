---
title: Corporate security accuracy stress audit
status: in_progress
priority: urgent
type: chore
tags: [corporate-plan, audit, security, analytics, regression]
created_by: agent
created_at: 2026-10-07T13:58:38Z
position: 134
---

## Notes
Perform Phase 4 final production audit for the Corporate multi-location system and Advanced Analytics. Trial, Starter, Business, and Professional must retain exactly their prior features, limits, pricing, add-ons, Quick QR behavior, permissions, customer behavior, loyalty behavior, billing behavior, and dashboard behavior. Any unintended non-Corporate regression is a release blocker.

Scope:
- Access testing for Corporate Admin, Location Manager, Staff, Customer, Super Admin, and lower plans.
- Quick QR entitlement validation for Corporate included access and lower-plan add-on behavior.
- Multi-location backend verification for at least three locations where production data exists; do not create mock data.
- Customer loyalty flow verification across multiple locations where production data exists; do not fabricate customer/stamp/reward activity.
- Analytics accuracy comparison against actual database records.
- Performance/stress audit for Corporate-scale query patterns and indexes without loading massive datasets into the browser.
- Security audit for business isolation, location isolation, customer isolation, analytics access, Quick QR authorization, and staff/location permissions.
- Audit logging verification where the existing audit architecture supports it.
- Regression verification for Trial, Starter, Business, and Professional.

## Checklist
- [ ] Capture live schema, RLS, plans, entitlements, indexes, and Corporate data availability
- [ ] Verify lower-plan pricing, limits, add-ons, Quick QR behavior, and Corporate-only entitlements
- [ ] Audit Corporate location access, staff-location assignment, default location, and location lifecycle security
- [ ] Audit location attribution for QR, Quick QR, stamps, rewards, redemptions, and customer activity
- [ ] Compare Advanced Analytics metrics against direct database aggregates
- [ ] Run performance and query-plan checks for Corporate-scale analytics paths
- [ ] Verify unauthorized access is rejected server-side
- [ ] Verify audit logs for supported location/staff/permission/admin loyalty actions
- [ ] Fix any release-blocking regression discovered, then retest
- [ ] Write final Phase 4 readiness report and stop

## Acceptance
The final report lists issues found, root causes, fixes made if any, security results, analytics accuracy, performance results, regression results, and Corporate readiness.
READY is reported only if all critical tests pass.
No lower-plan behavior is changed.