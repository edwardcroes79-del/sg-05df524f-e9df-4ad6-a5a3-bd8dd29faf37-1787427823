---
title: Excel Member Export Visibility Fix
status: in_progress
priority: urgent
type: bug
tags: [customers, export, excel, entitlements]
created_by: agent
created_at: 2026-10-14T12:20:37Z
position: 194
---

## Notes
Diagnose and fix why Excel Member Export is not visible for an Enterprise business after enabling `excel_member_export` in Super Admin. Scope includes verifying the saved `plan_entitlements` row for Enterprise, verifying the business subscription references the expected plan, tracing how Customers page frontend retrieves the entitlement, inspecting every condition controlling button visibility, confirming the button calls `/api/business/member-export`, and confirming backend entitlement enforcement remains independent. Do not implement Excel Member Import, hardcode Enterprise, change prices, limits, plan assignments, customer records, RLS, unrelated features, or deploy automatically. If the exact affected business cannot be identified from available data, report that and ask for the business ID/name needed for targeted verification.

## Checklist
- [ ] Verify Enterprise `excel_member_export` saved `plan_id`, `value_type`, and `boolean_value`
- [ ] Verify Enterprise business subscription references the correct plan record
- [ ] Inspect Customers page implementation and every condition controlling Export button visibility
- [ ] Inspect Phase 1 backend endpoint entitlement enforcement and API call path
- [ ] Apply the smallest integration fix without hardcoding plan names or weakening authorization
- [ ] Run checks and report root cause, files changed, test results, and `.xlsx` download status

## Acceptance
An authenticated business whose assigned plan has `excel_member_export = true` sees Export to Excel on the Customers page and can call the Phase 1 export endpoint. Businesses without the entitlement do not see an enabled export action and remain denied by the backend. Existing Customers page behavior continues working.