---
title: Excel Member Reconciliation APIs
status: todo
priority: urgent
type: feature
tags: [api, excel, reconciliation, memberships]
created_by: agent
created_at: 2026-10-14T16:58:09Z
position: 200
---

## Notes
Build focused API support for reconciliation preview and confirmation using the existing Royalty Stamp Excel Export format and import/export helper patterns. Inspect actual export columns and database relationships before implementation. Preview must never mutate data. Confirmation must revalidate authentication, active Owner role, entitlement, target program, candidates, and stale-preview token. Never trust uploaded business IDs or membership IDs for authorization. Compare only memberships for the authorized business and selected loyalty program. Use stable identifiers where available; never match by name alone. Preserve global customer profiles, stamp transactions, rewards, reward history, and historical records.

## Checklist
- [ ] Inspect customer_loyalty_cards, customers, rewards, stamp transaction relationships and safe removal options
- [ ] Parse and validate Royalty Stamp export workbooks with safe file-size and row-count limits
- [ ] Build preview payload showing current, retained, missing proposed removals, duplicates, invalid rows, and ambiguous matches
- [ ] Automatically preselect only safe removal candidates and block incomplete/mismatched workbooks
- [ ] Confirm removals with stale-preview protection and exact removed, retained, skipped, and failed counts
- [ ] Preserve history by removing only the membership association or using the verified safe schema-supported alternative

## Acceptance
Preview is read-only. Confirmation removes only verified eligible memberships for the authorized business and selected program. Ambiguous, invalid, cross-business, and stale candidates are skipped or blocked.