---
title: Anti-Fraud Stamp Enforcement
status: todo
priority: urgent
type: feature
tags: [anti-fraud, stamps, security]
created_by: agent
created_at: 2026-10-15T13:29:52Z
position: 215
---

## Notes
Implement server-side cooldown enforcement for every supported stamp issuance path after inspecting the existing shared stamp issuance logic. When anti-fraud is ON, the same member cannot receive another stamp in the same business and loyalty program until the selected cooldown expires. The rule must apply across QR, NFC, camera, hardware scanner, Search & Send Stamp, staff/device variations, and any current supported stamping method. Enforcement must be server-side, concurrency-safe, business/program isolated, and must not start or extend cooldowns for failed, rejected, or unauthorized attempts. When anti-fraud is OFF, this cooldown must not block repeat stamps; all existing authorization and membership checks still apply.

## Checklist
- [ ] Identify all current stamp issuance APIs/RPCs and shared server-side logic
- [ ] Add a reusable cooldown check around successful stamp issuance
- [ ] Make check + successful issuance concurrency-safe
- [ ] Return clear blocked response including remaining wait time
- [ ] Ensure cooldown starts only after successful stamp issuance
- [ ] Ensure failed/unauthorized/rejected attempts do not start or extend cooldown
- [ ] Cover QR, NFC, camera, hardware scanner, and Search & Send Stamp paths
- [ ] Verify business and loyalty-program boundaries are respected

## Acceptance
With anti-fraud ON, repeat stamps for the same member/business/program are blocked until cooldown expiry across all supported stamp paths. With anti-fraud OFF, repeat stamping is not blocked by this cooldown.