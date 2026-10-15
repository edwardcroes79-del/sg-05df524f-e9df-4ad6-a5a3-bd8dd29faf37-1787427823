---
title: Live Stamp System Safety Review
status: in_progress
priority: urgent
type: chore
tags: [anti-fraud, stamps, safety, production]
created_by: agent
created_at: 2026-10-15T13:48:09Z
position: 218
---

## Notes
Critical safety review for the live Royalty Stamp stamp system after Phase 1 anti-fraud backend/settings work. The live production application depends on existing stamp issuance, QR/NFC scanning, camera scanning, hardware scanner flows, Search & Send Stamp, Quick Stamp QR, reward redemption, customer balances, and transaction history. Before any further shared stamp-issuance changes, inspect and document the current issuance flow, shared RPC wrappers, reward redemption path, and database changes. Confirm anti-fraud OFF preserves existing behavior. Do not deploy, do not apply unreviewed production migrations, do not modify customer data, stamps, rewards, balances, or unrelated features. If integration risk is found, stop and report the blocker instead of applying a workaround.

## Checklist
- [ ] Inspect current shared stamp issuance RPC and wrapper RPCs
- [ ] Inspect QR/NFC/camera/hardware scanning UI paths and API/RPC calls
- [ ] Inspect Search & Send Stamp path
- [ ] Inspect Quick Stamp QR issue path
- [ ] Inspect reward redemption path and verify it is not coupled to cooldown writes
- [ ] Document the existing stamp issuance flow before anti-fraud enforcement
- [ ] Verify anti-fraud OFF preserves previous stamp behavior in rollback-only test data
- [ ] Verify safe development/staging test coverage and list unverified manual cases
- [ ] Identify any production migration/deployment review requirements
- [ ] Stop for review before deployment

## Acceptance
The review reports the exact existing stamp flow, files/RPCs inspected, whether anti-fraud OFF preserves behavior, which tests were actually executed, which live/manual tests remain unverified, and whether any blocker requires stopping before production deployment.