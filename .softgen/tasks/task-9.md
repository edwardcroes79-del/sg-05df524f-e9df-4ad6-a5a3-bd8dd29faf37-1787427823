---
title: Database and RLS Security Audit
status: in_progress
priority: urgent
type: bug
tags: [database, rls, security, audit]
created_by: agent
created_at: 2026-08-20T02:01:52Z
position: 9
---

## Notes
Audit only the production database structure and Row Level Security for Aruba Royalty Stamp. Scope includes businesses, business_users, customers, loyalty_programs, customer_loyalty_cards, stamp_transactions, rewards, qr_codes, subscription_plans, subscriptions, payment_transactions/payments, website_pages, branding/settings, audit logs, and any other production tables. Verify business isolation, customer isolation, staff access, owner access, super admin access, SELECT/INSERT/UPDATE/DELETE/WITH CHECK coverage, foreign keys, uniqueness, required fields, cascade behavior, and duplicate prevention. Fix only verified CRITICAL/HIGH database/RLS issues. Do not modify unrelated functionality, authentication flow, query optimization, or frontend behavior.

## Checklist
- [ ] Inspect live Supabase schema, table list, constraints, indexes, and RLS status
- [ ] Inspect all RLS policies for relevant production tables
- [ ] Identify CRITICAL/HIGH isolation or integrity defects
- [ ] Test representative unauthorized access scenarios at the database level
- [ ] Apply focused SQL fixes only for verified CRITICAL/HIGH issues
- [ ] Re-test policies and constraints after fixes
- [ ] Run project error checks

## Acceptance
Business A cannot access Business B private data through database policies.
Customer A cannot access Customer B private data through database policies.
Critical loyalty, stamp, reward, QR, staff, and subscription records have enforced ownership/isolation and integrity protections.