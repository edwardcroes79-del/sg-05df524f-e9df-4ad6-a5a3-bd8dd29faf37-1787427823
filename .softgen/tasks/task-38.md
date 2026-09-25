---
title: Reward Expiration Business Setting
status: in_progress
priority: high
type: feature
tags: [rewards, loyalty-programs, settings]
created_by: agent
created_at: 2026-09-25T17:20:43Z
position: 38
---

## Notes
Implement Phase 2 only for Royalty Stamp reward expiration. Add a business-configurable loyalty program setting for how long newly earned rewards remain valid. Do not modify reward creation logic, customer reward UI, reward redemption, QR behavior, Supabase auth, or unrelated SaaS functionality. Use the existing loyalty program settings architecture and preserve business isolation/RLS.

## Checklist
- [ ] Inspect current loyalty program create/edit settings and authorization behavior
- [ ] Add the minimum Supabase field needed for reward expiration setting with safe validation
- [ ] Regenerate Supabase TypeScript types after schema change
- [ ] Add "No expiration, 7, 14, 30, 60, 90, custom days" UI to existing loyalty program settings
- [ ] Save and reload the setting through the existing loyalty_programs update flow
- [ ] Validate custom days to reject zero, negative, invalid text, and overly large values
- [ ] Run project validation without changing reward creation/redemption behavior

## Acceptance
Existing programs show No expiration by default.
Business users who can edit loyalty programs can save 30/60/custom days and return to No expiration.
No reward creation, redemption, customer reward UI, QR, auth, billing, or database isolation behavior is changed beyond storing the setting.