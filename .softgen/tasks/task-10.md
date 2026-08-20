---
title: Authentication MFA and Role Security Audit
status: in_progress
priority: urgent
type: bug
tags: [auth, mfa, sessions, roles, security]
created_by: agent
created_at: 2026-08-20T02:07:42Z
position: 10
---

## Notes
Phase 2 scope only. Audit authentication, MFA, sessions, protected routes, logout behavior, password reset, role-based redirects, and Super Admin access for 297plugins@gmail.com. Do not modify loyalty cards, stamps, QR scanning logic, payments, subscription plans, database architecture, branding, or unrelated features. Use Supabase Auth as the source of truth. Fix verified authentication/MFA/role security issues only.

## Checklist
- [ ] Inspect business, customer, and Super Admin authentication flows
- [ ] Inspect protected route/session enforcement for dashboard, customer, and admin areas
- [ ] Inspect role-based redirects for super_admin, business_owner, business_staff, and customer
- [ ] Inspect Supabase MFA factor state and enrollment logic, especially Super Admin duplicate-factor handling
- [ ] Verify password reset and production redirect URL behavior
- [ ] Test feasible auth/session/RBAC scenarios with live Supabase state
- [ ] Apply focused fixes for verified critical/high authentication issues only
- [ ] Run project error checks after fixes

## Acceptance
Super Admin retains correct access, MFA factor lifecycle does not create duplicates, protected routes cannot be accessed by frontend state changes alone, and production auth redirects do not point to Softgen .dev URLs.