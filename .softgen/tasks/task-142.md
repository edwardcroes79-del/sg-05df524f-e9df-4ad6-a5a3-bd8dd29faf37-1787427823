---
title: Login UI regression restoration
status: in_progress
priority: urgent
type: bug
tags: [auth, ui-regression, login, customer-login]
created_by: agent
created_at: 2026-10-07T17:13:37Z
position: 142
---

## Notes
Restore the previous Business Login and Customer/Member Login visual UI after the Corporate build regression. This is UI-only: preserve Supabase Auth, registration, reset password, email verification, staff/customer/business redirects, existing translations, and branding assets. Do not redesign, simplify, or remove requested labels, headings, tabs, links, notices, or spacing.

Business Login must restore RoyaltyStamp branding, Welcome Back heading, credential helper text, Email Address and Password labels/inputs, Forgot password link, Sign In button, and Register your business link.

Customer/Member Login must restore RoyaltyStamp Wallet branding, Aruba rewards heading, Sign In/New Account tabs, Email Address and Password labels/inputs, Forgot Password link, Sign In to Earn Stamps button, customer terms/rewards notice, and merchant Business Login link.

## Checklist
- [ ] Inspect current Business Login and Customer/Member Login pages and related auth UI dependencies
- [ ] Identify why the UI regressed without changing authentication behavior
- [ ] Restore Business Login UI copy, branding, labels, links, spacing, and layout
- [ ] Restore Customer/Member Login UI copy, tabs, notices, links, spacing, and layout
- [ ] Preserve existing auth logic, redirects, translations, and branding assets
- [ ] Run project checks and report restored UI, files changed, auth link coverage, and language coverage

## Acceptance
Business Login matches the previous requested login structure and keeps existing authentication behavior.
Customer/Member Login matches the previous requested wallet login structure and keeps existing authentication behavior.
Project validation passes with no introduced errors.