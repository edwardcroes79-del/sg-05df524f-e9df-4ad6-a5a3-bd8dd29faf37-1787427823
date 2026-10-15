---
title: Anti-Fraud Settings Storage
status: done
priority: urgent
type: feature
tags: [anti-fraud, settings, database]
created_by: agent
created_at: 2026-10-15T13:29:52Z
position: 214
---

## Notes
Phase 1 anti-fraud foundation for Royalty Stamp. Live schema and current RLS patterns were inspected before implementation. Added persisted settings storage in `business_anti_fraud_settings`, blocked-attempt storage in `anti_fraud_blocked_attempts`, owner/admin helper functions, settings getter/upsert RPCs, and `src/pages/api/business/anti-fraud-settings.ts`. Anti-fraud is not plan gated and defaults to OFF with a 10-minute cooldown when missing/invalid. Cooldown duration is validated server-side to exactly 5, 10, or 15 minutes. Added an Owner/Admin dashboard settings card in `src/pages/dashboard/settings.tsx`. Staff cannot change settings through this API because `upsert_business_anti_fraud_settings` requires `can_manage_business_settings`. Rollback-only verification passed for default OFF/10 minutes, invalid duration rejection, all three valid durations, anti-fraud OFF repeat stamping, anti-fraud ON cooldown blocking with event recording, staff denial, and loyalty-program boundary isolation.

## Checklist
- [x] Inspect live schema for businesses, business users, roles, settings, stamp transactions, and current RLS patterns
- [x] Add persisted anti-fraud settings storage only if no suitable existing storage exists
- [x] Default missing/invalid enabled state to OFF and missing/invalid duration to 10 minutes
- [x] Add server-side settings read/update API with Owner/Admin authorization and staff denial
- [x] Validate cooldown duration server-side to only 5, 10, or 15 minutes
- [x] Add Owner/Admin UI controls in existing business settings area without plan gating
- [x] Verify settings persist after refresh/re-login at database/API level

## Acceptance
An authorized Owner/Admin can enable/disable anti-fraud and choose 5, 10, or 15 minutes. Staff cannot change settings. Missing settings behave as disabled with a 10-minute default duration.