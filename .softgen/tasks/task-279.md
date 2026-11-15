---
title: Staff stamp authorization repair
status: in_progress
priority: urgent
type: bug
tags: [stamps, staff, authorization, quick-stamp]
created_by: agent
created_at: 2026-11-15T14:20:39Z
position: 279
---

## Notes
Investigate and fix Staff authorization failures in both normal Issue Stamp and Quick Issue Stamp. Business Admin works, but Staff receives "Not authorized for this location" in normal stamp issuance and Quick Issue Stamp QR generation. The fix must preserve the existing stamp transaction engine, customer confirmation, membership validation, duplicate-scan protection, rate limits, reward creation, stamp history, loyalty records, QR token security, and server-side validation. Do not bypass location authorization or grant unrestricted staff access. Do not modify unrelated customer registration, billing, reminders, contracts, Superadmin, or loyalty transaction history.

## Checklist
- [ ] Inspect normal Issue Stamp page/API/RPC path and locate where "Not authorized for this location" is returned
- [ ] Inspect Quick Issue Stamp QR page/API/RPC path and compare its authorization inputs with normal stamp issuance
- [ ] Compare Business Admin vs Staff inputs: auth user ID, role, business ID, location ID, program ID, staff membership, staff permissions, and location assignments
- [ ] Inspect live database functions, policies, and staff/location tables involved in stamp authorization
- [ ] Identify whether both failures share the same underlying location/staff authorization cause
- [ ] Apply the smallest secure fix without changing the shared stamp transaction engine or weakening business/location isolation
- [ ] Validate Business Admin remains authorized, authorized Staff succeeds in both flows, and unauthorized Staff remains blocked

## Acceptance
- Authorized Staff can issue normal stamps for allowed business/location/program combinations.
- Authorized Staff can generate Quick Issue Stamp QR codes for allowed business/location/program combinations.
- Unauthorized Staff and cross-business access remain blocked, while Business Admin behavior remains unchanged.