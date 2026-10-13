---
title: Homepage Pricing Display Synchronization
status: in_progress
priority: high
type: bug
tags: [homepage, pricing, admin, display]
created_by: agent
created_at: 2026-10-13T16:10:30Z
position: 177
---

## Notes
Synchronize homepage pricing card display with the Super Admin plan configuration display for Free 14-Day Trial, Starter, Business, Professional, and Corporate. Scope is display-only: homepage pricing cards and Super Admin plan configuration display. Do not change backend limits, database values, subscription enforcement, permissions, billing, authentication, or deployment state. Preserve prices, trial duration, buttons, layout, responsive behavior, and existing plan features. Inspection found the homepage reads active public `subscription_plans` with nested `plan_entitlements` through `publicSubscriptionPlanSelect` in `src/lib/publicPlanDisplay.ts`, while Super Admin reads the same tables through `/api/admin/plans`. Approved homepage display overrides remain in `getHomepageDisplayLimits` so backend limits are not changed. Super Admin table display was adjusted to preserve stored `0` staff values instead of displaying `1` through `|| 1`. Corporate homepage-only planned feature descriptions were added without claiming implementation.

## Checklist
- [x] Inspect homepage pricing data flow and Super Admin plan display source for names, prices, limits, staff counts, and feature descriptions
- [x] Confirm whether homepage and Super Admin already use the same database-backed plan data source or identify any discrepancies
- [x] Apply safe homepage display-only corrections for loyalty limits, admin/staff account wording, and Corporate member/staff quantities
- [x] Add Corporate feature descriptions only to the Corporate homepage card while preserving existing features
- [x] Validate no relevant homepage plan-limit wording contains “Up to” and no backend/enforcement files changed
- [ ] Run static checks and report modified files, discrepancies, and remaining manual test steps

## Acceptance
Homepage pricing cards show the approved limits and account wording for all five plans. Corporate shows 15,000 Loyalty Members and the added Corporate-only feature descriptions. Super Admin display remains functional and no backend subscription enforcement is changed.