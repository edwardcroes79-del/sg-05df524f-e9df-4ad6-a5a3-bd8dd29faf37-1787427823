---
title: Excel Reconciliation Validation
status: todo
priority: high
type: chore
tags: [testing, authorization, excel, reconciliation]
created_by: agent
created_at: 2026-10-14T16:58:09Z
position: 202
---

## Notes
Run only relevant, safe tests for Phase 4. Do not modify production customer data or run destructive tests. Prefer static checks, API validation with unauthenticated/invalid-token probes, and safe test-business/test-data flows only when available. Clearly report tests not run.

## Checklist
- [ ] Verify entitled and non-entitled plan behavior where safe test data exists
- [ ] Verify missing members, unchanged export, empty/malformed/incomplete/wrong-program workbooks
- [ ] Verify duplicate rows, ambiguous matches, unauthorized staff, and cross-business protections where role tokens/test data exist
- [ ] Verify cancellation before confirmation causes no changes
- [ ] Verify customer profiles, stamps, rewards, and transaction history are preserved where safe test data exists
- [ ] Verify repeated submissions and stale previews are blocked
- [ ] Verify existing Excel Export and Import still pass relevant checks

## Acceptance
Relevant safe tests pass or are explicitly reported as not run with the missing prerequisite. No deployment is performed.