---
title: Staff stamping card selection restrictions
status: done
priority: high
type: feature
tags: [staff, stamping, authorization]
created_by: agent
created_at: 2026-11-26T11:03:45Z
position: 309
---
## Notes
Restrict staff stamping surfaces so staff can only view and use loyalty cards explicitly assigned to them, while owners and admins keep full business access. Apply this to both Issue Stamp and Quick Issue Stamp, show a clear empty-state message when no cards are assigned, and preserve the existing stamping workflow architecture.

Implemented scope:
- Normal Issue Stamp now filters visible loyalty cards to assigned cards for staff and shows the required no-assignment message when none are assigned.
- Quick Issue Stamp now filters visible loyalty cards to assigned cards for staff and shows the required no-assignment message when none are assigned.
- Owners and admins keep existing business-wide access.
- Server-side issuance authorization independently enforces the same assignment rules.

## Checklist
- [x] Inspect current Issue Stamp and Quick Issue Stamp loyalty-card selection behavior
- [x] Restrict visible loyalty cards for staff to assigned cards only
- [x] Auto-select the only assigned card when exactly one card is available
- [x] Show the required no-assignment message when no cards are assigned
- [x] Keep owner/admin access unchanged
- [x] Validate build/runtime behavior with the updated staff restrictions

## Acceptance
Staff sees only assigned loyalty cards on both stamping surfaces.
Staff with no assigned cards sees the required message and cannot issue stamps.
Quick Issue Stamp and normal Issue Stamp both respect assignments.