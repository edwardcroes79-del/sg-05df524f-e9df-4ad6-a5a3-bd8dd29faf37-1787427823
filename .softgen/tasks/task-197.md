---
title: Customers Excel Import Workflow
status: done
priority: high
type: feature
tags: [customers, import, excel, frontend]
created_by: agent
created_at: 2026-10-14T12:34:59Z
position: 197
---

## Notes
Added the Phase 3 Import from Excel workflow to the Business Admin Customers page. The button appears beside Export to Excel only when the authenticated business has `excel_member_import = true` from the saved entitlement system. The UI does not hardcode plan names or IDs and fails closed when entitlement lookup fails. Selecting a file does not import automatically. The dialog requires a `.xlsx` workbook and target loyalty program, calls `/api/business/member-import-preview`, displays valid, invalid, duplicate, existing, and ambiguous row counts plus a row preview, requires explicit confirmation, then calls `/api/business/member-import-confirm`. It shows loading states, prevents duplicate submissions, supports cancellation with no changes, refreshes Customers after confirmation, and displays a final created/skipped/failed summary. The frontend does not generate workbooks, query customer data for import, send customer data to third parties, or bypass backend authorization.

## Checklist
- [x] Add entitlement-gated Import from Excel button beside Export to Excel on `src/pages/dashboard/customers.tsx`
- [x] Add upload/preview dialog with target program selection, safe file validation messaging, row status summary, and cancellation
- [x] Add explicit confirmation flow with duplicate-click prevention and final success/skipped/failed summary
- [x] Preserve existing Customers search, pagination, details, redemption, and Excel Export behavior
- [x] Run checks and document remaining manual browser tests

## Acceptance
Entitled businesses can preview and confirm Excel member imports from the Customers page without automatic import on file selection. Non-entitled businesses do not see an enabled import action. Existing Customers page and Excel Export behavior continue working.