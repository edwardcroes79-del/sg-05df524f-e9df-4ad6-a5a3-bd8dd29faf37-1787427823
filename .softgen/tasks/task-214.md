---
title: Anti-Fraud Settings Storage
status: in_progress
priority: urgent
type: feature
tags: [anti-fraud, settings, database]
created_by: agent
created_at: 2026-10-15T13:29:52Z
position: 214
---

## Notes
Phase 1 anti-fraud foundation for Royalty Stamp. Inspect current schema, business settings, roles, and authorization before making changes. Anti-fraud must be available on every plan and must not be tied to subscription entitlements or paid add-ons. Each business needs persisted settings controlled only by authorized Business Owner/Admin: enabled ON/OFF, default OFF for missing/invalid saved setting, and cooldown duration limited to exactly 5, 10, or 15 minutes with default 10 minutes for missing/invalid duration. Staff must not be able to change settings through UI or direct API. Preserve existing plan entitlements, subscription rules, customer data, stamps, rewards, and history. No Phase 2 dashboard alerts.

## Checklist
- [ ] Inspect live schema for businesses, business users, roles, settings, stamp transactions, and current RLS patterns
- [ ] Add persisted anti-fraud settings storage only if no suitable existing storage exists
- [ ] Default missing/invalid enabled state to OFF and missing/invalid duration to 10 minutes
- [ ] Add server-side settings read/update API with Owner/Admin authorization and staff denial
- [ ] Validate cooldown duration server-side to only 5, 10, or 15 minutes
- [ ] Add Owner/Admin UI controls in existing business settings area without plan gating
- [ ] Verify settings persist after refresh/re-login at database/API level

## Acceptance
An authorized Owner/Admin can enable/disable anti-fraud and choose 5, 10, or 15 minutes. Staff cannot change settings. Missing settings behave as disabled with a 10-minute default duration.