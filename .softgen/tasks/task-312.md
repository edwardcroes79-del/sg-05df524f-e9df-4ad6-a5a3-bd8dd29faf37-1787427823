---
title: Anti-fraud settings section restoration
status: in_progress
priority: urgent
type: bug
tags: [security, anti-fraud, settings]
created_by: agent
created_at: 2026-11-26T12:20:00Z
position: 312
---
## Notes
User reports the Anti-Fraud Protection section is missing from Business Admin Settings (only 2FA shows under Account Security). Backend anti-fraud (cooldown, rate limits, blocked-attempt logging, alert trigger) was verified active in the live DB in task-311. The settings API `src/pages/api/business/anti-fraud-settings.ts` still exists. Restore the original Settings UI from git history; do not invent controls. Do not modify 2FA, password, profile, setup assistance, billing, staff assignment, or stamping.

Root cause: commit `c422d5e` (feat(auth): implement secure password-change flow) deleted the Anti-fraud protection card JSX from `src/pages/dashboard/settings.tsx` while adding the Change Password card. State, `fetchAntiFraudSettings`, `saveAntiFraudSettings`, the API, and DB enforcement were left intact (orphaned).

Restoration: card JSX copied verbatim from commit `dc73b5b` and reinserted directly above the 2FA card (its original adjacency).

## Checklist
- [x] Find the original Anti-Fraud Protection UI and the commit that removed or hid it
- [x] Confirm the API contract and DB settings table match the original UI
- [x] Restore the original section in Settings under Account Security
- [ ] Verify saved settings load and save, and backend enforcement still works
- [ ] Run check_for_errors

## Acceptance
Business Admins see the original Anti-Fraud Protection section in Settings with their saved configuration.
Changing the setting is enforced server-side, and 2FA remains unchanged.