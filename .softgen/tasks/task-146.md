---
title: Super Admin plan features and entitlements repair
status: in_progress
priority: urgent
type: bug
tags: [super-admin, plans, entitlements, features, security]
created_by: agent
created_at: 2026-10-08T11:45:20Z
position: 146
---

## Notes
Full repair request for Super Admin → Subscription Plans & Limits feature management and the actual database-backed entitlement system. Phase 1 is audit-first: inspect existing subscription plans, plan features, feature entitlements, plan/feature tables, entitlement checks, feature codes, limits, add-ons, Super Admin editor, server-side checks, RLS policies, and assignment logic before modifying code or database behavior.

Do not change authentication, customer/business/staff accounts, loyalty programs, stamps, rewards, billing, pricing, existing Quick QR implementation, add-ons, or RLS unless directly required to repair the plan entitlement system.

Approved plan configuration to preserve:
- Trial: AWG 0, 50 customers, 1 loyalty program, 1 staff.
- Starter: AWG 35/month, 500 customers, 1 loyalty program, 1 staff.
- Business: AWG 65/month, 2,000 customers, 5 loyalty programs, 3 staff.
- Professional: AWG 95/month, 5,000 customers, 10 loyalty programs, 10 staff.
- Corporate: AWG 250/month, 15,000 active customers, up to 10 locations, 25 loyalty programs, 50 staff, Corporate Advanced Analytics, multi-location management, location management, Location Manager, staff-location assignment, Corporate Quick QR included automatically, location-specific Quick QR, location analytics, cross-location analytics, Corporate Location Leaderboard.

Quick QR constraints:
- Trial/Starter/Business/Professional keep existing AWG 10 add-on behavior.
- Corporate includes Quick QR automatically.
- Do not create duplicate Quick QR feature or entitlement.
- Use the existing QUICK_STAMP_QR entitlement architecture.

## Checklist
- [ ] Audit live Supabase schema for plan, feature, entitlement, add-on, business subscription, and policy tables
- [ ] Trace Super Admin plan editor UI and identify why structured feature selection disappeared
- [ ] Trace admin plan APIs for feature assignment persistence and authorization
- [ ] Trace server-side entitlement checks and feature codes used by app/API routes
- [ ] Compare current database plan-feature assignments against intended Trial, Starter, Business, Professional, and Corporate configuration
- [ ] Identify entitlement mismatches and missing/unsafe server-side checks
- [ ] Restore database-backed feature selector UI without using free-form text as source of truth
- [ ] Repair plan-feature assignment persistence for create/edit/reload/remove flows
- [ ] Repair actual database/server-side entitlements without duplicate systems or frontend-only checks
- [ ] Verify Quick QR lower-plan add-on behavior and Corporate included behavior
- [ ] Verify Corporate feature entitlements and non-Corporate restrictions
- [ ] Verify customer, loyalty program, staff, location, and Corporate feature limits are server-enforced
- [ ] Run UI persistence test for add/remove/save/reload and entitlement effect
- [ ] Run regression checks for Trial, Starter, Business, Professional, and Corporate
- [ ] Run project validation and report root cause, architecture, changes, assignments, checks, security, tests, and remaining mismatches

## Acceptance
The Super Admin plan editor uses database-backed feature selection and persists assignments across save/reload for existing and new plans.
Database entitlements, not UI text or frontend conditionals, control feature access and plan limits server-side.
Trial, Starter, Business, Professional, and Corporate retain approved pricing/limits and correct Quick QR/Corporate entitlement behavior.