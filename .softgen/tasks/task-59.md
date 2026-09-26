---
title: Database-Driven Plan Feature Descriptions
status: in_progress
priority: high
type: feature
tags: [billing, plans, admin, ui]
created_by: agent
created_at: 2026-09-26T21:28:23Z
position: 59
---

## Notes
Make subscription plan feature descriptions fully database-driven. Custom plans created by Super Admins must display a complete list of feature descriptions instead of just numeric limits or truncated lists. Super Admins must be able to add, edit, remove, and reorder these feature strings. Existing plans (Starter, Business, Enterprise) must keep their descriptions working via the new data structure. Do not hard-code feature lists or maximum limits in the UI.

## Checklist
- [ ] Inspect `subscription_plans` schema to see if a `features` jsonb column exists
- [ ] Inspect pricing cards in `index.tsx`, `onboarding.tsx`, and `dashboard/billing.tsx` to find hardcoded descriptions
- [ ] Inspect `admin/index.tsx` and `api/admin/plans.ts` for plan creation/editing
- [ ] Update Super Admin plan management UI to support dynamic feature array editing (add, edit, remove, reorder)
- [ ] Migrate existing hardcoded plan features into the database/default list
- [ ] Update all plan display cards to render the dynamic feature descriptions from the database
- [ ] Create a temporary Mega Plan with 8+ features to verify
- [ ] Run check_for_errors and clean up

## Acceptance
Super Admin can define an unlimited, ordered list of feature descriptions for any plan.
Plan cards display the exact database-driven feature list for that plan.
Existing plans continue to display their original features correctly.