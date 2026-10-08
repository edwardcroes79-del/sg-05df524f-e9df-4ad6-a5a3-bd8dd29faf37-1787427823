---
title: Public pricing plan synchronization
status: in_progress
priority: urgent
type: bug
tags: [pricing, homepage, admin, plans, i18n]
created_by: agent
created_at: 2026-10-08T17:47:09Z
position: 159
---

## Notes
The public homepage pricing cards previously loaded only `subscription_plans` and then assembled feature rows locally in `src/pages/index.tsx`, adding hardcoded limits and `includes_premium_templates` text before appending `subscription_plans.features`. Super Admin uses the secure `/api/admin/plans` source, which reads `subscription_plans` plus `plan_entitlements` and shows active feature badges from entitlements.

The homepage now reads active public-safe `subscription_plans` with nested `plan_entitlements` directly under public RLS. Feature rows are generated from plan limits and active public entitlements with duplicate filtering and i18n labels. Legacy `subscription_plans.features` display text is not appended to public pricing cards, because the audited database still contains stale items like Birthday Rewards (SOON) and Advanced Features (SOON) that are not active entitlements. No plan pricing, limits, billing, or entitlement values were changed.

## Checklist
- [x] Audit the homepage pricing feature source and identify the hardcoded/stale list
- [x] Audit the Super Admin Subscription Plans & Limits source and database-backed API/query
- [x] Add or reuse a public-safe plan configuration query/API that returns plan name, prices, limits, and public display entitlements
- [x] Update the homepage pricing cards to render dynamic plan data without duplicate features
- [x] Map entitlement identifiers to customer-facing labels through the existing i18n system with safe fallbacks
- [x] Verify cache behavior does not require deployment for plan feature changes
- [ ] Run checks and report changed files, queries, translations, and test coverage

## Acceptance
The public homepage pricing cards match the active database-backed Super Admin plan configuration.
No duplicate features or raw internal translation keys appear in English, Spanish, or Papiamento.
The existing pricing-card visual layout remains unchanged.