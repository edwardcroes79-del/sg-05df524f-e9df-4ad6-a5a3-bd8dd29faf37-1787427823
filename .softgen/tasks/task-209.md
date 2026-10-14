---
title: Customers Import Button Regression
status: done
priority: urgent
type: bug
tags: [customers, excel, import, entitlement]
created_by: agent
created_at: 2026-10-14T20:46:43Z
position: 209
---

## Notes
Fixed the missing Import from Excel button by restoring correct business resolution for entitlement checks and preserving the original import workflow. The existing Import from Excel button, dialog, `resetImportWorkflow()`, `setImportDialogOpen(true)`, preview, duplicate detection, validation, and confirmation handlers were already present in `src/pages/dashboard/customers.tsx`. Root cause: after recent changes, the Customers page could resolve an active `business_users` membership before checking the logged-in user's owned business, causing an Owner to be evaluated against the wrong business/membership and receive `canImportMembers = false` even when the owned business entitlement was true. The fix prioritizes the logged-in Owner's business from `businesses.owner_id` first, then falls back to active `business_users` membership for non-owner/staff access. The entitlement resolver migration `supabase/migrations/20261014210200_fix_excel_import_entitlement_resolver.sql` was already applied in the environment: Botica Benu now resolves `excel_member_import = true`, while Test 13 Oct, Royalty Stamp Demo, and Royalty Stamp Admin resolve false as expected. Export to Excel and Reconcile Members entitlements remain separate and unchanged. No replacement importer was created. No customer records, membership data, stamps, rewards, import APIs, production configuration, unrelated features, or deployment were changed. `check_for_errors` passed.

## Checklist
- [x] Inspect current Customers page toolbar and `canImportMembers` gating
- [x] Verify whether the resolver migration is applied in the relevant environment
- [x] Inspect the actual entitlement value returned for the resolved business
- [x] Identify the remaining conditional-rendering, entitlement, permission, stale-state, or layout cause
- [x] Restore the original Import from Excel button beside Export and Reconcile
- [x] Verify the button opens the existing import dialog via `resetImportWorkflow()` and `setImportDialogOpen(true)`
- [x] Confirm import preview, validation, duplicate detection, and confirmation remain connected
- [x] Confirm Export to Excel, Reconcile Members, search, VIP filtering, and responsive layout remain unchanged
- [x] Run validation and report exact root cause, changed files, and test results

## Acceptance
The Customers page visibly shows Import from Excel for businesses whose resolved `excel_member_import` entitlement is true and keeps it hidden for businesses where it is false. Clicking the button opens the original import dialog and preserves the existing preview/confirm workflow.