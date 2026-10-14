---
title: Excel Member Export Visibility Fix
status: done
priority: urgent
type: bug
tags: [customers, export, excel, entitlements]
created_by: agent
created_at: 2026-10-14T12:20:37Z
position: 194
---

## Notes
Diagnose and fix why Excel Member Export is not visible for an Enterprise business after enabling `excel_member_export` in Super Admin. Scope includes verifying the saved `plan_entitlements` row for Enterprise, verifying the business subscription references the expected plan, tracing how Customers page frontend retrieves the entitlement, inspecting every condition controlling button visibility, confirming the button calls `/api/business/member-export`, and confirming backend entitlement enforcement remains independent. Do not implement Excel Member Import, hardcode Enterprise, change prices, limits, plan assignments, customer records, RLS, unrelated features, or deploy automatically. Root cause found: `src/pages/dashboard/customers.tsx` rendered the button only when `canExportMembers` became true, but it called a non-existent frontend RPC named `get_business_effective_boolean_entitlement`. The live schema exposes `get_business_boolean_entitlement` and `get_business_entitlement_bool`, not `get_business_effective_boolean_entitlement`; the failed RPC returned no true value, and the page failed closed by hiding the Export to Excel button everywhere. Backend Phase 1 enforcement was already independent and reads `plan_entitlements.excel_member_export` directly. Fix: Customers page now checks the existing live `get_business_boolean_entitlement` RPC with `p_key = "excel_member_export"` and `p_fallback = false`, logs lookup failures without exposing the button, and continues using `/api/business/member-export` for the actual download. Verified Enterprise configuration: business `99c8514c-e1a8-486f-9675-59c74d336566` (`Test 13 Oct`) is assigned `subscription_plan = Enterprise`; plan `Enterprise` has `plan_entitlements.key = excel_member_export`, `value_type = boolean`, and `boolean_value = true`; the owner membership for that business is active. The backend export endpoint still rejects unauthenticated and invalid-token requests and does not hardcode Enterprise. Static checks passed with no CSS, linting, type checking, or server errors. Files changed: `src/pages/dashboard/customers.tsx` and this task record. Test results: Enterprise entitlement row and business assignment were verified by database query; Customers page visibility condition now uses the live entitlement RPC; backend endpoint path remains `/api/business/member-export`; unauthenticated and invalid-token endpoint checks were previously verified as rejected; check_for_errors passed. Actual authenticated `.xlsx` download was not executed because this sandbox does not have the real Enterprise user session token needed to perform a browser-authenticated export without exposing credentials.

## Checklist
- [x] Verify Enterprise `excel_member_export` saved `plan_id`, `value_type`, and `boolean_value`
- [x] Verify Enterprise business subscription references the correct plan record
- [x] Inspect Customers page implementation and every condition controlling Export button visibility
- [x] Inspect Phase 1 backend endpoint entitlement enforcement and API call path
- [x] Apply the smallest integration fix without hardcoding plan names or weakening authorization
- [x] Run checks and report root cause, files changed, test results, and `.xlsx` download status

## Acceptance
An authenticated business whose assigned plan has `excel_member_export = true` sees Export to Excel on the Customers page and can call the Phase 1 export endpoint. Businesses without the entitlement do not see an enabled export action and remain denied by the backend. Existing Customers page behavior continues working.