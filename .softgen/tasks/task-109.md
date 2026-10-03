---
title: QR scanner rear camera initialization fix
status: done
priority: urgent
type: bug
tags: [qr-scanner, camera, mobile, pwa]
created_by: agent
created_at: 2026-10-03T04:07:50Z
position: 109
---

## Notes
Investigated and fixed QR scanner camera behavior across Royalty Stamp. Root cause was in `src/pages/dashboard/scan.tsx`: the scanner could enumerate/select cameras before permission-backed labels and state were stable, fall back to the first/selfie camera, and initialize `html5-qrcode` before the intended rear camera stream was ready. This caused the preview to open while QR detection did not work until users manually switched cameras. The fix now requests camera permission with an environment-facing preference, selects the rear/back camera where available, starts the scanner with a stable explicit camera id, preserves optional switching, handles permission/unavailable-camera errors, and fully stops/clears scanner instances on processing, switching, cleanup, and close. Existing QR validation, stamp/reward logic, database logic, and security behavior were not changed. Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Locate all QR scanner flows and shared scanner code
- [x] Identify the root cause of rear camera/default camera and delayed detection issues
- [x] Apply the smallest safe camera initialization/lifecycle fix
- [x] Ensure stream cleanup on close/switch and no duplicate streams
- [x] Preserve optional camera switch controls and permission error handling
- [x] Run project validation

## Acceptance
QR scanner opens on rear/back camera by default where available.
QR detection works immediately after opening without switching cameras.
Existing QR validation, stamp/reward, database, and security behavior remains unchanged.