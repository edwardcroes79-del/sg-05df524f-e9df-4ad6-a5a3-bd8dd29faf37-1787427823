---
title: Birthday Rewards Option A Draft
status: done
priority: urgent
type: feature
tags: [birthday-rewards, migration, review]
created_by: agent
created_at: 2026-10-25T03:07:48Z
position: 236
---

## Notes
Revise the existing Birthday Rewards Stage A migration draft only. Do not apply migrations, execute write SQL, modify production data, deploy, enable cron, send notifications, or activate Birthday Rewards. Option A removes external notification preference storage and supports in-app celebration discovery from the award ledger after a successful committed birthday stamp award.

## Checklist
- [x] Remove customer notification preference table and related trigger, policies, grants, indexes, and comments from the Stage A draft
- [x] Add minimal in-app celebration acknowledgement to the birthday award ledger
- [x] Keep correction audit history private and Super Admin-only
- [x] Verify owner/Super Admin business settings authorization remains scoped and staff are excluded
- [x] Validate the revised draft with available project checks
- [x] Report final specification, rollback SQL, security protections, planned UI changes, and blockers

## Acceptance
The migration draft is revised for Option A review only and remains unapplied.