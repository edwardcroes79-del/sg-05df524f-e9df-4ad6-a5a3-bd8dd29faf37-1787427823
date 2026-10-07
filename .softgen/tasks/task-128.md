---
title: Corporate plan architecture audit
status: done
priority: high
type: chore
tags: [corporate-plan, audit, architecture, database]
created_by: agent
created_at: 2026-10-07T13:20:22Z
position: 128
---

## Notes
Phase 1 audit and architecture only for the new Corporate plan is complete. No code, database schema, production data, mock data, plan prices, existing plan limits, add-on prices, permissions, RLS, billing behavior, or lower-plan Quick QR behavior was changed.

Report created:
- `.softgen/corporate-plan-phase-1-audit.md`

Key audit finding:
- The database already contains an active Corporate plan row: `subscription_plans.id = mega_plan`, name `Corporate`, price `AWG 250.00`, `15,000` customers, `25` loyalty programs, and `50` staff.
- Missing Corporate-specific entitlements are `quick_stamp_qr`, `advanced_analytics`, and `max_locations`.
- Existing Quick QR add-on remains active at AWG 10/month for lower plans and should not be changed.
- Corporate should receive Quick QR through plan entitlement, not by requiring an add-on subscription.

## Checklist
- [x] Inspect existing database schema, plan/entitlement tables, RLS-relevant relationships, and indexes
- [x] Inspect existing code paths for billing/plans/add-ons, Quick QR, QR codes, staff roles, customers, stamp issuance, rewards, analytics, and Super Admin plan management
- [x] Identify existing Quick QR entitlement behavior and how Corporate can include it without add-on records or duplicate entitlements
- [x] Design Corporate location, staff-location, program-location, transaction-location, QR-location, analytics, audit, and security architecture
- [x] Identify required indexes, performance risks, regression risks, and isolation requirements
- [x] Write Phase 1 audit report as markdown only
- [x] Run no implementation changes and stop after the audit

## Acceptance
A markdown audit report documents existing architecture, proposed Corporate architecture, security/RLS approach, performance strategy, risks, and exact Phase 2 implementation plan.
No production data, code, schema, plans, pricing, add-ons, or permissions are changed.