---
title: QR scanner verified rear camera selection
status: in_progress
priority: urgent
type: bug
tags: [qr-scanner, camera, mobile, pwa]
created_by: agent
created_at: 2026-10-03T16:07:10Z
position: 110
---

## Notes
Fix the existing QR scanner camera selection logic after confirmed device behavior: Camera 0 facing back works correctly, while Camera 2 facing back can show a blurry preview and fail QR decoding. Investigate why the scanner selects Camera 2 instead of the known-working Camera 0. Do not blindly select numeric index 0 on every device because camera ordering varies by phone/browser. Use device IDs and available facing/label information. When Camera 0 is verified as the working rear camera on the current device, persist/use that camera for later scanner openings on that device. Ensure decoder frames come from the same active stream shown in preview. Preserve manual camera switching as fallback. Do not change QR validation, stamp issuance, reward redemption, database logic, RLS, or unrelated features.

## Checklist
- [x] Inspect current scanner camera enumeration, active camera state, retry behavior, and switch fallback
- [x] Identify why affected phones select Camera 2 instead of the verified working Camera 0
- [x] Implement device-safe rear camera preference using remembered working device IDs and cautious camera labeling/order heuristics
- [x] Ensure scanner preview and decoder use the same active stream
- [x] Preserve manual camera switching and stream cleanup
- [ ] Run project validation

## Acceptance
Affected phones prefer the verified working rear camera after it is known on that device.
Scanner does not blindly force numeric camera index 0 on every device.
Existing QR validation, stamp/reward, database, and security behavior remains unchanged.