---
title: Cooldown Blocked Attempt Events
status: todo
priority: high
type: feature
tags: [anti-fraud, audit, events]
created_by: agent
created_at: 2026-10-15T13:29:52Z
position: 216
---

## Notes
Record server-side events for cooldown-blocked stamp attempts only. These records are for Phase 2 investigation/alerts, but Phase 2 UI, badges, email notifications, and dashboard alerts must not be built now. Records should include only necessary investigation data: business, loyalty program, member/customer identifier, staff user identifier when available, attempted timestamp, rejection reason, cooldown duration, and remaining wait time. Blocked attempts must not be recorded as successful stamps and must not restart or extend cooldown. Protect records from unauthorized modification/deletion and avoid unnecessary duplicate/excessive writes.

## Checklist
- [ ] Inspect existing audit/event tables before creating a new table
- [ ] Add/reuse secure server-side event recording for cooldown-blocked attempts
- [ ] Store minimal investigation fields only
- [ ] Prevent unauthorized modification/deletion through RLS or server-only writes
- [ ] Ensure blocked attempts do not alter successful stamp/reward history
- [ ] Avoid duplicate/excessive event writes under repeated blocked attempts

## Acceptance
Cooldown-blocked attempts are securely recorded for future Phase 2 investigation without changing successful stamp history or creating dashboard alerts.