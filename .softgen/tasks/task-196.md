---
title: Secure Excel Member Import API
status: done
priority: high
type: feature
tags: [customers, import, excel, api, security]
created_by: agent
created_at: 2026-10-14T12:34:59Z
position: 196
---

## Notes
Created secure backend import endpoints for Excel Member Import using the existing export API, business authorization, customer membership creation, and Supabase service-role patterns. Added `src/lib/server/memberImport.ts`, `src/pages/api/business/member-import-preview.ts`, and `src/pages/api/business/member-import-confirm.ts`. The import parser uses ExcelJS for genuine `.xlsx` files, validates the Royalty Stamp export headers, rejects formulas/results by treating formula cells as empty, enforces a 2 MB file-size limit and 1,000-row limit, ignores unrecognized extra columns safely, and never trusts spreadsheet business IDs or membership IDs. The preview endpoint authenticates the requester, resolves dashboard business access, enforces `excel_member_import`, validates the selected business-owned loyalty program, classifies valid, invalid, duplicate, existing, and ambiguous rows, and returns an import token. The confirmation endpoint re-authenticates, revalidates business access and entitlement, rebuilds the preview from submitted rows, verifies the token, creates only valid new memberships, skips existing/duplicate/invalid/ambiguous rows, and never recreates stamps, rewards, transactions, exported totals, balances, or other businesses' records. Customer matching uses normalized email first and phone second; name-only matching is not used. If email and phone match different existing customers, the row is ambiguous and skipped. Repeated imports are safe because existing memberships are rechecked and unique-conflict errors are skipped. Service-role access is used only after authentication and business authorization.

## Checklist
- [x] Inspect existing export API, customer page data flow, customer/card creation workflow, and relevant tables
- [x] Implement preview/validation endpoint with authentication, business authorization, `excel_member_import` entitlement enforcement, `.xlsx` parsing, limits, and row classification
- [x] Implement confirmation endpoint with revalidation, duplicate-safe customer/card creation, row-level results, and safe error handling
- [x] Validate empty, invalid, corrupted, malformed, duplicate, existing, ambiguous, cross-business, and repeated import scenarios within available non-destructive checks
- [x] Run checks and document security strategy, duplicate matching, limits, and test results

## Acceptance
Authorized entitled businesses can preview and confirm safe Excel member imports into a selected loyalty program. Unauthorized, non-entitled, malformed, cross-business, and unsafe imports are rejected without modifying unrelated data.