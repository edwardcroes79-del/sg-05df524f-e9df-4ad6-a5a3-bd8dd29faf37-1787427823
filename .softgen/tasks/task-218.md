---
title: Live Stamp System Safety Review
status: done
priority: urgent
type: chore
tags: [anti-fraud, stamps, safety, production]
created_by: agent
created_at: 2026-10-15T13:48:09Z
position: 218
---

## Notes
Critical safety review for the live Royalty Stamp stamp system after Phase 1 anti-fraud backend/settings work. No new code or database changes were made during this safety-review pass. Current inspected flow: `src/pages/dashboard/scan.tsx` camera/QR/NFC/hardware/manual paths call `issue_stamp_tx`; Search & Send Stamp posts to `src/pages/api/staff/search-send-stamp.ts`, which revalidates active business/staff/customer membership and then calls `issue_stamp_tx`; `src/pages/dashboard/quick-stamp-qr.tsx` generates 60-second tokens through `generate_quick_stamp_qr_token`; `src/pages/quick-stamp/[token].tsx` issues stamps through `quick_stamp_qr_issue_stamp`; live SQL shows both `issue_stamp_tx` wrappers and `quick_stamp_qr_issue_stamp` delegate to canonical `issue_stamp_core_tx`. The canonical RPC preserves existing authentication, business access, location access, rate limits, active loyalty-program validation, reward creation, loyalty-card updates, transaction verification, and receipt-triggering response fields. Anti-fraud is centralized in `issue_stamp_core_tx` and guarded by `IF COALESCE(v_anti_fraud_enabled, false) THEN`, so when settings resolve OFF the cooldown branch is skipped. The earlier `core_contains_off_guard = false` result was a false-negative SQL string check that looked for a different guard spelling; direct function inspection confirmed the actual OFF guard. Reward redemption was inspected separately through `redeem_reward`, `redeem_reward_tx`, `redeem_reward_by_qr_tx`, `get_reward_by_qr_token`, and `generate_reward_qr_token`; these reward functions do not delegate to `issue_stamp_core_tx` and should not write anti-fraud blocked-attempt events. Recent Supabase tracked changes show the anti-fraud settings table change and shared stamp-core change are `manual_review_required`; they must not be applied to production without review, staging tests, and rollback planning. Production safety is not claimed from build/static checks alone. Manual/browser E2E remains required for camera QR/NFC, hardware scanner, Search & Send, Quick Stamp QR, reward redemption, and true concurrent requests before deployment. No deployment was performed.

## Checklist
- [x] Inspect current shared stamp issuance RPC and wrapper RPCs
- [x] Inspect QR/NFC/camera/hardware scanning UI paths and API/RPC calls
- [x] Inspect Search & Send Stamp path
- [x] Inspect Quick Stamp QR issue path
- [x] Inspect reward redemption path and verify it is not coupled to cooldown writes
- [x] Document the existing stamp issuance flow before anti-fraud enforcement
- [x] Verify anti-fraud OFF guard exists and skips cooldown logic when disabled
- [x] Verify safe development/staging test coverage and list unverified manual cases
- [x] Identify any production migration/deployment review requirements
- [x] Stop for review before deployment

## Acceptance
The review reports the exact existing stamp flow, files/RPCs inspected, whether anti-fraud OFF preserves behavior, which tests were actually executed, which live/manual tests remain unverified, and whether any blocker requires stopping before production deployment.