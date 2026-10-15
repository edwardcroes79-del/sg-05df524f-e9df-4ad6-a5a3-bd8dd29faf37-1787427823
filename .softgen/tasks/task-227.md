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
Focused UI bug fix for the Security Alerts page. Only two behaviors are in scope: the Refresh button spinner must stop after a manual refresh finishes or fails, and background polling/realtime reconnects must not keep the manual refresh button loading; the fallback text about realtime being unavailable must remain visible and stable while polling continues and only change when the actual connection status meaningfully changes. Root cause found in `src/pages/dashboard/security-alerts.tsx`: `loadAlerts(..., quiet=true)` set `refreshing=true`, and every background polling/reconnect/focus refresh used `quiet=true`, so the manual Refresh button spinner displayed during automatic work. The realtime effect also depended on `connectionStatus`, so status changes could tear down/recreate the subscription and polling interval, contributing to repeated status/message changes. Applied smallest UI-only fix: added a `manualRefresh` flag so only the button click sets `refreshing`, kept background refreshes silent, changed the page’s initial monitoring state to stable polling fallback, stopped treating mere subscription setup as “live,” and removed `connectionStatus` from the subscription effect dependency while keeping polling active.

## Checklist
- [x] Inspect the current manual refresh handler, background polling, and connection-status state
- [x] Separate manual refresh loading from background refresh loading
- [x] Stabilize fallback message rendering so polling/reconnect cycles do not cause flashing
- [ ] Run project checks and document actual browser verification limits

## Acceptance
The Refresh button returns to idle after manual refresh success or failure, background polling does not show the manual spinner, and the fallback text remains stable while automatic polling continues.