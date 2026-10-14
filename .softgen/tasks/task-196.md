---
title: Secure Excel Member Import API
status: todo
priority: high
type: feature
tags: [customers, import, excel, api, security]
created_by: agent
created_at: 2026-10-14T12:34:59Z
position: 196
---

## Notes
Create secure backend import endpoints for Excel Member Import. Reuse existing export API, business authorization, customer membership creation, and Supabase service-role patterns. The import must parse genuine `.xlsx`, validate export-format headers, enforce file-size and row-count limits, classify valid, invalid, duplicate, existing, and ambiguous rows, require explicit confirmation, and revalidate authorization and data on confirmation. Never trust spreadsheet business IDs or membership IDs. Never execute formulas or trust uploaded formula results. Import only into the authenticated user's authorized business and selected target loyalty program. Never overwrite existing profiles, merge by name, recreate stamps/rewards/transactions, modify balances, delete records, or import secrets. Repeated imports must be safe and not create duplicate memberships.

## Checklist
- [ ] Inspect existing export API, customer page data flow, customer/card creation workflow, and relevant tables
- [ ] Implement preview/validation endpoint with authentication, business authorization, `excel_member_import` entitlement enforcement, `.xlsx` parsing, limits, and row classification
- [ ] Implement confirmation endpoint with revalidation, duplicate-safe customer/card creation, row-level results, and safe error handling
- [ ] Validate empty, invalid, corrupted, malformed, duplicate, existing, ambiguous, cross-business, and repeated import scenarios
- [ ] Run checks and document security strategy, duplicate matching, limits, and test results

## Acceptance
Authorized entitled businesses can preview and confirm safe Excel member imports into a selected loyalty program. Unauthorized, non-entitled, malformed, cross-business, and unsafe imports are rejected without modifying unrelated data.