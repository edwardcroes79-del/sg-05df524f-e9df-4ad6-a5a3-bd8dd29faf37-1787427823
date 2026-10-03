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
Investigate and fix QR scanner camera behavior across Royalty Stamp. The scanners must request the rear/back camera by default, initialize QR detection immediately after opening, preserve optional camera switching, handle permissions/unavailable cameras gracefully, stop previous MediaStreams when switching/closing, prevent multiple streams, and work consistently on Android mobile browsers/PWA and desktop where supported. Do not change QR validation, stamp/reward logic, database logic, security, or fake scan success.

## Checklist
- [ ] Locate all QR scanner flows and shared scanner code
- [ ] Identify the root cause of rear camera/default camera and delayed detection issues
- [ ] Apply the smallest safe camera initialization/lifecycle fix
- [ ] Ensure stream cleanup on close/switch and no duplicate streams
- [ ] Preserve optional camera switch controls and permission error handling
- [ ] Run project validation

## Acceptance
QR scanner opens on rear/back camera by default where available.
QR detection works immediately after opening without switching cameras.
Existing QR validation, stamp/reward, database, and security behavior remains unchanged.