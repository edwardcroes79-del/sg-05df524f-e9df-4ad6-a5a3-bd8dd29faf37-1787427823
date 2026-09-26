---
title: Database-Driven Plan Feature Descriptions
status: done
priority: high
type: feature
tags: [billing, plans, admin, ui]
created_by: agent
created_at: 2026-09-26T21:28:23Z
position: 59
---

## Notes
Make subscription plan feature descriptions fully database-driven. Custom plans created by Super Admins must display a complete list of feature descriptions instead of just numeric limits or truncated lists. Super Admins must be able to add, edit, remove, and reorder these feature strings. Existing plans (Starter, Business, Enterprise) must keep their descriptions working via the new data structure. Do not hard-code feature lists or maximum limits in the UI.

I've added the `features` string array to the API payload, updated the `admin/index.tsx` UI to allow adding, editing, and deleting these strings dynamically, and updated the frontend `index.tsx` so that it directly pulls active plans from the database rather than from `homeConfig.ts`. It intelligently merges numeric capabilities alongside the configurable database feature descriptions. A SQL query ran to backfill existing features for the default plans to retain stability. A "Mega Plan" was created with 9 features to verify functionality, and `dashboard/billing.tsx` also renders the dynamic feature mapping.

## Checklist
- [x] Inspect `subscription_plans` schema to see if a `features` jsonb column exists
- [x] Inspect pricing cards in `index.tsx`, `onboarding.tsx`, and `dashboard/billing.tsx` to find hardcoded descriptions
- [x] Inspect `admin/index.tsx` and `api/admin/plans.ts` for plan creation/editing
- [x] Update Super Admin plan management UI to support dynamic feature array editing (add, edit, remove, reorder)
- [x] Migrate existing hardcoded plan features into the database/default list
- [x] Update all plan display cards to render the dynamic feature descriptions from the database
- [x] Create a temporary Mega Plan with 8+ features to verify
- [x] Run check_for_errors and clean up

## Acceptance
Super Admin can define an unlimited, ordered list of feature descriptions for any plan.
Plan cards display the exact database-driven feature list for that plan.
Existing plans continue to display their original features correctly.