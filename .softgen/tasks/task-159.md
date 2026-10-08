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
The public homepage pricing cards currently show stale or duplicated hardcoded feature lists. The homepage must use the same database-backed Subscription Plans & Limits source used by Super Admin as the single source of truth. Do not change Trial, Starter, Business, Professional, or Corporate pricing/limits. Do not expose internal entitlement codes or admin-only fields. Preserve the existing homepage pricing-card design and existing language system for English, Spanish, and Papiamento.

## Checklist
- [ ] Audit the homepage pricing feature source and identify the hardcoded/stale list
- [ ] Audit the Super Admin Subscription Plans & Limits source and database-backed API/query
- [ ] Add or reuse a public-safe plan configuration query/API that returns plan name, prices, limits, and public display entitlements
- [ ] Update the homepage pricing cards to render dynamic plan data without duplicate features
- [ ] Map entitlement identifiers to customer-facing labels through the existing i18n system with safe fallbacks
- [ ] Verify cache behavior does not require deployment for plan feature changes
- [ ] Run checks and report changed files, queries, translations, and test coverage

## Acceptance
The public homepage pricing cards match the active database-backed Super Admin plan configuration.
No duplicate features or raw internal translation keys appear in English, Spanish, or Papiamento.
The existing pricing-card visual layout remains unchanged.