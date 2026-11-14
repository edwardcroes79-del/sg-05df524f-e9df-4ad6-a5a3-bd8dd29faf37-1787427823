---
title: Quick Issue Stamp staff authorization
status: done
priority: urgent
type: bug
tags: [quick-stamp, staff, authorization]
created_by: agent
created_at: 2026-11-14T21:30:08Z
position: 278
---

## Notes
Investigated and fixed why Quick Issue Stamp worked for Business Admin but showed "Quick Issue Stamp unavailable" and "Not authorized for this location" for authorized Staff. The fix preserves the existing Quick Issue Stamp transaction flow, QR token security, 60-second rotation, customer scan/confirmation, repeat-scan protection, add-on entitlement validation, staff permissions, and business/location isolation. The root cause was the page sending a browser-stored active location directly into the secure QR token RPC; that location could be valid for Business Admin but outside the Staff member's assigned location scope.

## Checklist
- [x] Inspect Quick Issue Stamp page, QR token generation API, and staff/location authorization code paths
- [x] Compare Business Admin and Staff authorization inputs: user ID, business ID, staff membership, location assignment, program ID, add-on entitlement, and permission checks
- [x] Inspect live schema/RPC/policies related to Quick Issue Stamp, business users, staff locations, and permissions
- [x] Identify the exact check that passes for Business Admin but fails for authorized Staff
- [x] Apply the smallest secure fix without weakening unauthorized staff/business isolation
- [x] Validate Business Admin remains authorized, authorized Staff can generate QR, unauthorized Staff remain blocked, and existing Quick Issue Stamp protections remain intact

## Acceptance
- Authorized Staff can open Quick Issue Stamp for their assigned/allowed business location.
- Unauthorized Staff still see an authorization block.
- Existing Business Admin Quick Issue Stamp behavior and token/stamp security are unchanged.