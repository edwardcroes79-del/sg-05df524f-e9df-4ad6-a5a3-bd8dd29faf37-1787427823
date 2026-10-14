---
title: Customers Excel Export Button
status: in_progress
priority: high
type: feature
tags: [customers, export, excel, frontend]
created_by: agent
created_at: 2026-10-14T12:07:48Z
position: 193
---

## Notes
Implement Phase 2 only for Royalty Stamp Excel Member Export: add an Export to Excel button to `src/pages/dashboard/customers.tsx`. Use the secure Phase 1 backend endpoint `/api/business/member-export` for all exports; do not generate workbooks in the frontend, query customer data directly, or send data to third-party services. Show the button only when the authenticated business has the saved `excel_member_export` entitlement enabled. Do not hardcode plan names, plan IDs, or tiers. If entitlement status cannot be determined, fail closed by not exposing an enabled export action. Preserve existing Customers page search, pagination, detail drawer/modal behavior, layout, registration/login flows, loyalty cards, stamps, rewards, customer records, database schema, RLS, and backend permissions. Handle loading, duplicate-click prevention, filename extraction, success/error toasts, object URL cleanup, empty-list behavior, and responsive layout. Do not deploy automatically. Implementation uses the existing `get_business_effective_boolean_entitlement` RPC with `p_key = "excel_member_export"` and `p_fallback = false`, so entitlement uncertainty fails closed. The button calls only `/api/business/member-export` with the current Supabase access token, relies on backend authorization/data retrieval/workbook generation, verifies the Excel MIME type, uses the API-provided filename when available, cleans up temporary object URLs, and displays safe user-facing toast messages.

## Checklist
- [x] Inspect Customers page layout, auth/session handling, toast pattern, and available icon imports
- [x] Add entitlement lookup using the authenticated business subscription plan and `plan_entitlements.excel_member_export`
- [x] Add responsive Export to Excel button near search/member-count controls when entitled
- [x] Wire button to `/api/business/member-export` with loading state, safe errors, filename download, and object URL cleanup
- [ ] Verify existing Customers page search, pagination, and customer detail behavior remain intact
- [ ] Run checks and report files changed, tests, and remaining issues

## Acceptance
Entitled businesses see an Export to Excel button on the Customers page and download the backend-generated `.xlsx` file. Non-entitled or unknown-entitlement businesses do not see an enabled export action. The frontend uses the Phase 1 backend endpoint and saved `excel_member_export` entitlement without changing plan settings or customer data.