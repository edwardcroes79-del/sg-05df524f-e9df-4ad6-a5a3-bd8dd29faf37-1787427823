---
title: Security Alerts Refresh UI Fix
status: in_progress
priority: urgent
type: bug
tags: [anti-fraud, alerts, ui, realtime]
created_by: agent
created_at: 2026-10-15T15:27:53Z
position: 227
---

## Notes
Focused UI bug fix for the Security Alerts page. Only two behaviors are in scope: the Refresh button spinner must stop after a manual refresh finishes or fails, and background polling/realtime reconnects must not keep the manual refresh button loading; the fallback text about realtime being unavailable must remain visible and stable while polling continues and only change when the actual connection status meaningfully changes. Preserve the existing page layout, automatic polling, fallback message, realtime subscription attempt, cooldown enforcement, alert creation, staff identity, permissions, business isolation, stamping, and reward redemption. Do not deploy.

## Checklist
- [ ] Inspect the current manual refresh handler, background polling, and connection-status state
- [ ] Separate manual refresh loading from background refresh loading
- [ ] Stabilize fallback message rendering so polling/reconnect cycles do not cause flashing
- [ ] Run project checks and document actual browser verification limits

## Acceptance
The Refresh button returns to idle after manual refresh success or failure, background polling does not show the manual spinner, and the fallback text remains stable while automatic polling continues.