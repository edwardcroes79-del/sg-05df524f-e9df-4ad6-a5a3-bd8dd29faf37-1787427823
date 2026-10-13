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
Synchronize homepage pricing card display with the Super Admin plan configuration display for Free 14-Day Trial, Starter, Business, Professional, and Corporate. Scope is display-only: homepage pricing cards and, only if needed, Super Admin plan configuration display. Do not change backend limits, database values, subscription enforcement, permissions, billing, authentication, or deployment state. Preserve prices, trial duration, buttons, layout, responsive behavior, and existing plan features. Add Corporate homepage-only feature descriptions for VIP Member Identification, Excel Member Export, Bulk Member Import, Bulk Member Management, and Search Stamp access control for staff configurable by Business Admin. Inspect the existing data source and report discrepancies before making unsafe changes.

## Checklist
- [ ] Inspect homepage pricing data flow and Super Admin plan display source for names, prices, limits, staff counts, and feature descriptions
- [ ] Confirm whether homepage and Super Admin already use the same database-backed plan data source or identify any discrepancies
- [ ] Apply safe homepage display-only corrections for loyalty limits, admin/staff account wording, and Corporate member/staff quantities
- [ ] Add Corporate feature descriptions only to the Corporate homepage card while preserving existing features
- [ ] Validate no relevant homepage plan-limit wording contains “Up to” and no backend/enforcement files changed
- [ ] Run static checks and report modified files, discrepancies, and remaining manual test steps

## Acceptance
Homepage pricing cards show the approved limits and account wording for all five plans. Corporate shows 15,000 Loyalty Members and the added Corporate-only feature descriptions. Super Admin display remains functional and no backend subscription enforcement is changed.