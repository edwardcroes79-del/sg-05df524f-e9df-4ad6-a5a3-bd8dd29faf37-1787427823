---
title: Investigate Staff Access to Member Portal
status: in_progress
priority: high
type: bug
tags: [security, auth, authorization, customer, staff]
created_by: agent
created_at: 2026-11-10T13:35:00Z
position: 273
---

## Notes
A user reported that an account registered as Staff can log in to the Customer/Member portal using their existing credentials.
The objective is to investigate the exact reason why Staff can authenticate into the Member portal without completing customer registration.

This is a read-only investigation. No fixes will be implemented without approval.

## Checklist
- [x] Inspect Member login page (`src/pages/auth/customer.tsx`).
- [x] Inspect Member protected routes (`src/components/customer/CustomerLayout.tsx`).
- [x] Check how Supabase Auth treats Staff vs Customer login.
- [x] Check role/profile resolution logic in the Member portal.
- [x] Document findings and proposed solution.

## Acceptance
- The root cause is clearly identified.
- Relevant files and logic flaws are listed.
- Recommended minimal correction is provided.
- NO code or database changes made.

## Investigation Report

### Exact Root Cause
The system treats successful Supabase authentication as proof of Customer membership due to two compounding logic flaws:
1. **Missing Authorization on Login:** Staff and Customers share the same Supabase Auth identity pool. When a Staff member logs in via `src/pages/auth/customer.tsx`, the system authenticates their email and password but fails to check their role or verify if they are a registered customer before redirecting them to `/customer`.
2. **Unconditional Automatic Provisioning:** When the authenticated Staff member lands in the Member portal, the `src/components/customer/CustomerLayout.tsx` wrapper checks for an existing record in the `customers` table. If one is not found, the frontend *automatically executes an `insert` query to create one*. This inadvertently auto-provisions a Customer profile for any valid Staff or Superadmin account that visits the page.

### Relevant Frontend Files
- `src/pages/auth/customer.tsx` - Handles Member sign-in but skips role resolution (unlike `src/pages/auth/login.tsx`, which correctly routes users based on their profile role).
- `src/components/customer/CustomerLayout.tsx` - Contains the flawed `checkAuth` logic that auto-inserts missing customer rows for any authenticated user.

### Relevant Database Tables
- `auth.users` - Shared authentication pool.
- `customers` - Customer profiles. RLS policies currently allow users to insert their own profile, permitting the frontend auto-provisioning to succeed.
- `profiles` / `business_users` - Used for role identification, but completely ignored by the Member login flow.

### Recommended Minimal Correction (Pending Approval)
1. **Update Member Login (`src/pages/auth/customer.tsx`):** After successful authentication, fetch the user's `profiles.role` or check if they exist in `business_users`. If they are identified as Staff or Business Owner, deny access to the Member portal (or securely redirect them to the business `/dashboard`).
2. **Remove Auto-Provisioning (`src/components/customer/CustomerLayout.tsx`):** Remove the `insert` block inside `checkAuth`. If an authenticated user does not have a row in the `customers` table, they should be logged out or redirected back to the login/signup page with an "Account not found" error. Customer profile creation should strictly occur during the explicit Customer Registration flow.