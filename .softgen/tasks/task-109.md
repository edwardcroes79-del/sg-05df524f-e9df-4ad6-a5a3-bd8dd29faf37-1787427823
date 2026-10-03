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
Follow-up investigation for phones where the camera opened on the rear camera but the first stream was blurry and QR detection did not work until switching cameras away and back. Root cause was in `src/pages/dashboard/scan.tsx`: `html5-qrcode` was started as soon as a camera ID was selected, without waiting for the video element to exist, load metadata, and report valid video dimensions. On some mobile browsers/PWAs this allowed a low-quality rear stream and QR detection loop to initialize too early; switching cameras forced a fresh stream, which made the image clearer and detection work. The fix now requests environment-facing rear-camera constraints at a suitable 1280x720 ideal resolution, waits for the scanner video to be ready with valid dimensions, applies continuous autofocus only when the active track supports it, retries initialization once after cleanup if the first startup fails, and preserves manual camera switching. Existing QR validation, stamp issuance, reward redemption, database logic, RLS, and unrelated functionality were not changed. Project validation passed with no CSS, linting, TypeScript, or server errors. Physical Android/iPhone camera hardware testing could not be performed from the sandbox.

## Checklist
- [x] Locate all QR scanner flows and shared scanner code
- [x] Inspect current scanner stream startup, video readiness, camera constraints, focus behavior, and cleanup
- [x] Identify the root cause of blurry first stream and inactive first-attempt detection
- [x] Apply the smallest safe initialization fix
- [x] Add one safe retry path without repeated initialization loops
- [x] Ensure stream cleanup on close/switch and no duplicate streams
- [x] Preserve QR validation, stamp/reward, database, RLS, and security behavior
- [x] Run project validation

## Acceptance
QR scanner opens on rear/back camera by default where available.
QR detection works immediately after opening without switching cameras.
Scanner waits for a usable video stream and dimensions before detection starts.
Existing QR validation, stamp/reward, database, and security behavior remains unchanged.