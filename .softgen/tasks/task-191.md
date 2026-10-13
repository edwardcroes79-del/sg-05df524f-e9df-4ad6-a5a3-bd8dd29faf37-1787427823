---
title: Homepage Pricing Full Plan Features
status: in_progress
priority: high
type: bug
tags: [homepage, pricing, plans, localization]
created_by: agent
created_at: 2026-10-13T20:01:05Z
position: 191
---

## Notes
Fix homepage pricing cards so they display the complete configured feature list for each visible subscription plan from Super Admin → Subscription Plans & Limits. The source of truth must be the authoritative plan configuration: limits, plan `features`, and enabled `plan_entitlements`, preserving order where configured. Apply to Free 14-Day Trial, Starter, Business, Professional, Corporate, Enterprise, and visible custom/duplicated plans. Do not use shortened arrays, generic lists, plan-name hardcoding, CSS hiding, or database overwrites. Hidden plans must remain hidden. Do not modify backend authorization, prices, limits, subscriptions, entitlements, customer data, or deployment state. Preserve localization: English should render complete English feature descriptions, other supported languages should continue working, and missing translations must fall back safely without dropping configured features. Preserve card design, wrapping, responsive layout, aligned price/button positions, and existing CTA behavior.

## Checklist
- [ ] Inspect homepage pricing component, public plan display helper, localization files, and Super Admin plan configuration shape
- [ ] Inspect visible subscription plan `features`, limits, and enabled entitlements without exporting customer data
- [ ] Update homepage pricing data mapping to combine configured limits, ordered plan features, and enabled entitlement labels without hardcoded plan-specific replacements
- [ ] Preserve localization with safe fallbacks for every configured feature/entitlement
- [ ] Verify hidden plans remain hidden and duplicated/custom visible plans render their saved configuration
- [ ] Run checks and report root cause, files changed, and verification results

## Acceptance
Homepage pricing cards show all configured plan limits and features in the same order as Super Admin configuration, including premium Corporate/Enterprise entitlements where enabled. English displays English labels, other languages continue working, and missing translations never hide configured features. No plan prices, limits, entitlements, subscriptions, customer data, or backend authorization are modified.