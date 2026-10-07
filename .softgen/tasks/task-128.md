---
title: Corporate plan architecture audit
status: in_progress
priority: high
type: chore
tags: [corporate-plan, audit, architecture, database]
created_by: agent
created_at: 2026-10-07T13:20:22Z
position: 128
---

## Notes
Phase 1 is audit and architecture only for a new Corporate plan. Do not implement code, create tables, modify production data, create mock data, or change existing plans/add-ons/pricing/permissions/billing behavior. Inspect existing production architecture, database, RLS, roles, businesses, staff, customers, loyalty programs, stamps, rewards, redemptions, QR system, Quick QR Stamp, plan entitlements, analytics, and performance constraints. Corporate must be isolated through existing plan/entitlement architecture and must not affect Trial, Starter, Business, Professional, Enterprise, lower-plan Quick QR add-on behavior, existing add-ons, or existing limits.

## Checklist
- [x] Inspect existing database schema, plan/entitlement tables, RLS-relevant relationships, and indexes
- [ ] Inspect existing code paths for billing/plans/add-ons, Quick QR, QR codes, staff roles, customers, stamp issuance, rewards, analytics, and Super Admin plan management
- [ ] Identify existing Quick QR entitlement behavior and how Corporate can include it without add-on records or duplicate entitlements
- [ ] Design Corporate location, staff-location, program-location, transaction-location, QR-location, analytics, audit, and security architecture
- [ ] Identify required indexes, performance risks, regression risks, and isolation requirements
- [ ] Write Phase 1 audit report as markdown only
- [ ] Run no implementation changes and stop after the audit

## Acceptance
A markdown audit report documents existing architecture, proposed Corporate architecture, security/RLS approach, performance strategy, risks, and exact Phase 2 implementation plan.
No production data, code, schema, plans, pricing, add-ons, or permissions are changed.