---
title: Duplicated Corporate Analytics Authorization
status: in_progress
priority: urgent
type: bug
tags: [analytics, entitlements, plans, dashboard]
created_by: agent
created_at: 2026-10-13T18:55:40Z
position: 188
---

## Notes
Investigate and fix “Analytics unavailable — Location analytics access denied” for a brand-new business assigned to a duplicated Corporate subscription plan. Do not assume missing customers/cards/stamp history causes authorization denial; empty activity should produce zero metrics or an empty state, not access denied. Scope includes tracing the exact backend/API condition producing the denial, checking duplicated-plan analytics/location entitlements, verifying business-plan and location-business association, identifying hardcoded Corporate plan ID/name checks, and preserving business-level data isolation and lower-tier restrictions. Do not fabricate analytics data, change plan prices or limits, modify unrelated subscriptions, run destructive migrations, or deploy automatically.

## Checklist
- [ ] Trace the exact frontend and backend code path that produces “Location analytics access denied”
- [ ] Inspect duplicated-plan analytics, location analytics, cross-location analytics, location-management, and related entitlements
- [ ] Verify backend reads the correct business subscription plan and location business association
- [ ] Identify hardcoded Corporate plan-name/ID checks that exclude duplicated plans
- [ ] Fix authorization to use configured entitlements and return empty analytics states for authorized no-activity accounts
- [ ] Run checks and report root cause, changed files, migrations, and tests

## Acceptance
A brand-new business assigned to a duplicated Corporate plan can access Advanced Analytics when the saved plan entitlements allow it. Empty analytics data returns zero metrics or a helpful empty state instead of an authorization error. Lower-tier plans without the relevant entitlement remain blocked, and original Corporate continues working.