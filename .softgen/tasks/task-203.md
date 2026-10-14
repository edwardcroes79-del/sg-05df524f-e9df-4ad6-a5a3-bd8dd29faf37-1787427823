---
title: Reconcile Members UI Wiring Fix
status: done
priority: urgent
type: bug
tags: [customers, reconciliation, excel]
created_by: agent
created_at: 2026-10-14T18:44:01Z
position: 203
---

## Notes
User reports that an edited export with two original members and one remaining row is being previewed through Import Members as `Valid: 0, Existing: 1`, with no proposed removal. Import Members remains unchanged and continues rejecting empty imports. Diagnosis: a separate Reconcile Members workflow exists and calls `/api/business/member-reconcile-preview`, but the Customers page only renders the button when `get_business_boolean_entitlement` returns `true` for `bulk_member_removal`. The live entitlement query found no saved `bulk_member_removal` rows, so the Reconcile button can be hidden and users are left using Import Members. A migration file exists to seed this entitlement for Corporate/Enterprise, but it has not been applied to the live database in this session. No customer data, memberships, stamps, rewards, transactions, or production records were modified.

## Checklist
- [x] Verify Customers page renders a separate Reconcile Members action and identify entitlement gating
- [x] Verify Reconcile dialog calls `/api/business/member-reconcile-preview`
- [x] Verify reconciliation preview compares current selected-program memberships against uploaded member rows
- [x] Patch only the confirmed UI/API wiring gap
- [x] Run static validation and safe non-mutating checks
- [x] Report cause, changed files, test results, and manual test steps

## Acceptance
Import Members remains unchanged. Reconcile Members exists as a separate workflow for entitled owners and previews missing current memberships without modifying data. The current blocker is entitlement configuration: `bulk_member_removal` must be enabled for the business plan before the button appears and the server-side APIs allow reconciliation.