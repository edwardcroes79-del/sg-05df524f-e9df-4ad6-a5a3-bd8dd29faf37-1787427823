---
title: Secure Excel Member Export API
status: done
priority: high
type: feature
tags: [members, export, excel, api, security]
created_by: agent
created_at: 2026-10-14T11:59:51Z
position: 192
---

## Notes
Implement Phase 1 only for Royalty Stamp Excel Member Export: backend API under `src/pages/api/business/` that generates a genuine `.xlsx` file for loyalty members. No frontend button, no plan entitlement changes, no subscription assignment changes, no customer record changes, no unrelated API changes, no RLS/policy changes, and no deployment. Endpoint must authenticate the requester, resolve the business through existing authorized business-access rules, independently enforce `excel_member_export` from `plan_entitlements`, never trust an unverified client business ID, query only `customer_loyalty_cards` for the verified business joined to `customers` and `loyalty_programs`, support internal pagination, handle empty lists, prevent spreadsheet formula injection, avoid logging PII, return 403 for unauthorized/lower-tier plans, and return a valid Excel MIME attachment. Export columns: Member Name, Email Address, Phone Number, Registration Date, Loyalty Program, Membership Status, Card Created Date, Last Updated Date, Current Stamps, Total Stamps, Rewards Earned, Stamp Target, Reward Title. Inspection confirmed npm/package-lock is the package manager setup and no Excel writer was installed. Added `exceljs@4.4.0` for genuine `.xlsx` workbook generation, reflected in `package.json` and `package-lock.json`. The endpoint resolves the authenticated dashboard business using the existing `get_business_dashboard_access_status` pattern, then uses the service role only after authentication/business access is verified. It enforces `plan_entitlements.excel_member_export = true`, ignores any client-supplied business ID, scopes all membership rows by verified `business_id`, paginates internally in 1,000-row batches, rejects exports over 10,000 rows with HTTP 413 rather than silently truncating, and prefixes dangerous spreadsheet-leading characters in text cells to prevent formula injection. Empty member lists produce a valid workbook with headers only. Non-destructive validation completed: `npm ls exceljs --depth=0` reports `exceljs@4.4.0`; unauthenticated and invalid-token API calls return HTTP 401 without exposing server details; a standalone ExcelJS workbook round-trip produced a valid `.xlsx` buffer and confirmed dangerous values beginning with `=`, `+`, `-`, `@`, tab, and carriage return are prefixed; a database count probe confirmed membership rows exist without selecting or exporting customer PII; static checks passed with no CSS, linting, type checking, or server errors. Remaining manual pre-release validation requires real authenticated session tokens for Corporate, Enterprise, lower-tier, and cross-business users so the API can be exercised without exposing credentials in chat. Modified files: `package.json`, `package-lock.json`, `src/pages/api/business/member-export.ts`, and this task record. No deployment was performed.

## Checklist
- [x] Inspect package manager, existing API conventions, auth/business resolution patterns, and relevant database schema
- [x] Install a compatible genuine Excel generation library and update dependency lock files
- [x] Create secure backend export endpoint with authentication, business authorization, entitlement enforcement, and business-scoped queries
- [x] Add internal pagination, empty-list handling, clear export limits, safe error responses, and spreadsheet formula-injection protection
- [x] Validate unauthenticated, invalid-token, dependency, non-PII row count, and valid `.xlsx`/formula-injection behavior without exporting unrelated data
- [x] Run static checks and report files changed, dependency added, authorization approach, tests, and remaining issues

## Acceptance
Authorized businesses with `excel_member_export` receive a valid `.xlsx` workbook containing only their loyalty member data. Unauthenticated, unauthorized, cross-business, and non-entitled requests are rejected. Empty member lists produce a safe valid workbook or clear non-sensitive response.