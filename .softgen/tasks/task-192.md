---
title: Secure Excel Member Export API
status: in_progress
priority: high
type: feature
tags: [members, export, excel, api, security]
created_by: agent
created_at: 2026-10-14T11:59:51Z
position: 192
---

## Notes
Implement Phase 1 only for Royalty Stamp Excel Member Export: backend API under `src/pages/api/business/` that generates a genuine `.xlsx` file for loyalty members. No frontend button, no plan entitlement changes, no subscription assignment changes, no customer record changes, no unrelated API changes, no RLS/policy changes, and no deployment. Endpoint must authenticate the requester, resolve the business through existing authorized business-access rules, independently enforce `excel_member_export` from `plan_entitlements`, never trust an unverified client business ID, query only `customer_loyalty_cards` for the verified business joined to `customers` and `loyalty_programs`, support internal pagination, handle empty lists, prevent spreadsheet formula injection, avoid logging PII, return 403 for unauthorized/lower-tier plans, and return a valid Excel MIME attachment. Export columns: Member Name, Email Address, Phone Number, Registration Date, Loyalty Program, Membership Status, Card Created Date, Last Updated Date, Current Stamps, Total Stamps, Rewards Earned, Stamp Target, Reward Title. Inspection confirmed npm/package-lock is the package manager setup and no Excel writer was installed. Added `exceljs` for genuine `.xlsx` workbook generation. The endpoint resolves the authenticated dashboard business using the existing `get_business_dashboard_access_status` pattern, then uses the service role only after authentication/business access is verified. It enforces `plan_entitlements.excel_member_export = true`, ignores any client-supplied business ID, scopes all membership rows by verified `business_id`, paginates internally in 1,000-row batches, rejects exports over 10,000 rows with HTTP 413 rather than silently truncating, and prefixes dangerous spreadsheet-leading characters in text cells to prevent formula injection. Empty member lists produce a valid workbook with headers only.

## Checklist
- [x] Inspect package manager, existing API conventions, auth/business resolution patterns, and relevant database schema
- [x] Install a compatible genuine Excel generation library and update dependency lock files
- [x] Create secure backend export endpoint with authentication, business authorization, entitlement enforcement, and business-scoped queries
- [x] Add internal pagination, empty-list handling, clear export limits, safe error responses, and spreadsheet formula-injection protection
- [ ] Validate authorized, unauthorized, empty-list, cross-business, lower-tier, and valid `.xlsx` behavior without exporting unrelated data
- [ ] Run static checks and report files changed, dependency added, authorization approach, tests, and remaining issues

## Acceptance
Authorized businesses with `excel_member_export` receive a valid `.xlsx` workbook containing only their loyalty member data. Unauthenticated, unauthorized, cross-business, and non-entitled requests are rejected. Empty member lists produce a safe valid workbook or clear non-sensitive response.