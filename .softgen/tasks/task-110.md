---
title: QR scanner verified rear camera selection
status: done
priority: urgent
type: bug
tags: [qr-scanner, camera, mobile, pwa]
created_by: agent
created_at: 2026-10-03T16:07:10Z
position: 110
---

## Notes
Fixed the existing QR scanner camera selection logic after confirmed device behavior: Camera 0 facing back works correctly, while Camera 2 facing back can show a blurry preview and fail QR decoding. Root cause was in `src/pages/dashboard/scan.tsx`: the previous camera preference logic explicitly treated labels containing `camera2` as preferred and otherwise fell back to the last camera, which can select the wrong rear lens on affected phones. The updated logic uses device IDs, rear/back/environment label information, cautious scoring, avoids globally hard-coding numeric index 0, prioritizes Camera 0 only when it is labeled as rear/back on the current device, and persists the working rear camera device ID only after a successful decode. Manual camera switching remains available as fallback. Existing QR validation, stamp issuance, reward redemption, database logic, RLS, and unrelated functionality were not changed. Project validation passed with no CSS, linting, TypeScript, or server errors. Physical Android/iPhone camera hardware testing could not be performed from the sandbox.

## Checklist
- [x] Inspect current scanner camera enumeration, active camera state, retry behavior, and switch fallback
- [x] Identify why affected phones select Camera 2 instead of the verified working Camera 0
- [x] Implement device-safe rear camera preference using remembered working device IDs and cautious camera labeling/order heuristics
- [x] Ensure scanner preview and decoder use the same active stream
- [x] Preserve manual camera switching and stream cleanup
- [x] Run project validation

## Acceptance
Affected phones prefer the verified working rear camera after it is known on that device.
Scanner does not blindly force numeric camera index 0 on every device.
Existing QR validation, stamp/reward, database, and security behavior remains unchanged.