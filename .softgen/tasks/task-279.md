---
title: Staff stamp authorization repair
status: done
priority: urgent
type: bug
tags: [stamps, staff, authorization, quick-stamp]
created_by: agent
created_at: 2026-11-15T14:20:39Z
position: 279
---

## Notes
Investigated and fixed Staff authorization failures in both normal Issue Stamp and Quick Issue Stamp. Business Admin worked, but Staff received "Not authorized for this location" because both pages could pass a browser-stored `active_location_<businessId>` directly into the secure stamp/QR RPC. That stored location can be valid for a Business Admin but outside an authorized Staff member's assigned location scope. The fix preserves the existing stamp transaction engine, customer confirmation, membership validation, duplicate-scan protection, rate limits, reward creation, stamp history, loyalty records, QR token security, and server-side validation. No location authorization was bypassed; both flows now resolve a currently accessible business location before calling the existing secure server/RPC checks.

## Checklist
- [x] Inspect normal Issue Stamp page/API/RPC path and locate where "Not authorized for this location" is returned
- [x] Inspect Quick Issue Stamp QR page/API/RPC path and compare its authorization inputs with normal stamp issuance
- [x] Compare Business Admin vs Staff inputs: auth user ID, role, business ID, location ID, program ID, staff membership, staff permissions, and location assignments
- [x] Inspect live database functions, policies, and staff/location tables involved in stamp authorization
- [x] Identify whether both failures share the same underlying location/staff authorization cause
- [x] Apply the smallest secure fix without changing the shared stamp transaction engine or weakening business/location isolation
- [x] Validate Business Admin remains authorized, authorized Staff succeeds in both flows, and unauthorized Staff remains blocked

## Acceptance
- Authorized Staff can issue normal stamps for allowed business/location/program combinations.
- Authorized Staff can generate Quick Issue Stamp QR codes for allowed business/location/program combinations.
- Unauthorized Staff and cross-business access remain blocked, while Business Admin behavior remains unchanged.