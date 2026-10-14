---
title: Reconcile Members UI Wiring Fix
status: in_progress
priority: urgent
type: bug
tags: [customers, reconciliation, excel]
created_by: agent
created_at: 2026-10-14T18:44:01Z
position: 203
---

## Notes
User reports that an edited export with two original members and one remaining row is being previewed through Import Members as `Valid: 0, Existing: 1`, with no proposed removal. Import Members must remain unchanged and continue rejecting empty imports. Diagnose whether the separate Reconcile Members workflow exists, whether it is visible/enabled in the Customers UI, and whether it calls the reconciliation endpoint rather than the import endpoint. Fix only wiring or missing separate workflow behavior; do not modify customer data, production records, existing import behavior, or deploy.

## Checklist
- [ ] Verify Customers page renders a separate Reconcile Members action and identify entitlement gating
- [ ] Verify Reconcile dialog calls `/api/business/member-reconcile-preview`
- [ ] Verify reconciliation preview compares current selected-program memberships against uploaded member rows
- [ ] Patch only the confirmed UI/API wiring gap
- [ ] Run static validation and safe non-mutating checks
- [ ] Report cause, changed files, test results, and manual test steps

## Acceptance
Import Members remains unchanged. Reconcile Members is clearly accessible as a separate workflow for entitled owners and previews missing current memberships without modifying data.