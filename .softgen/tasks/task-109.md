---
title: QR scanner rear camera initialization fix
status: in_progress
priority: urgent
type: bug
tags: [qr-scanner, camera, mobile, pwa]
created_by: agent
created_at: 2026-10-03T04:07:50Z
position: 109
---

## Notes
Follow-up investigation for phones where the camera opens on the rear camera but the first stream is blurry and QR detection does not work until switching cameras away and back. Must identify the scanner initialization root cause before changing code. Preserve QR validation, stamp issuance, reward redemption, database logic, RLS, and unrelated functionality. Manual camera switching must remain available as fallback. Do not fake scan results or hide camera errors.

## Checklist
- [x] Locate all QR scanner flows and shared scanner code
- [x] Inspect current scanner stream startup, video readiness, camera constraints, focus behavior, and cleanup
- [x] Identify the root cause of blurry first stream and inactive first-attempt detection
- [x] Apply the smallest safe initialization fix
- [ ] Add one safe retry path without repeated initialization loops
- [x] Ensure stream cleanup on close/switch and no duplicate streams
- [x] Preserve QR validation, stamp/reward, database, RLS, and security behavior
- [ ] Run project validation

## Acceptance
QR scanner opens on rear/back camera by default where available.
QR detection works immediately after opening without switching cameras.
Scanner waits for a usable video stream and dimensions before detection starts.
Existing QR validation, stamp/reward, database, and security behavior remains unchanged.