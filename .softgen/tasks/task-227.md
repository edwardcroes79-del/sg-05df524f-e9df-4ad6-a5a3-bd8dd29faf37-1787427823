---
title: Security Alerts Refresh UI Fix
status: done
priority: urgent
type: bug
tags: [anti-fraud, alerts, ui, realtime]
created_by: agent
created_at: 2026-10-15T15:27:53Z
position: 227
---

## Notes
Focused UI bug fix for the Security Alerts page. Only two behaviors were in scope: the Refresh button spinner must stop after a manual refresh finishes or fails, and background polling/realtime reconnects must not keep the manual Refresh button loading; the fallback text about realtime being unavailable must remain visible and stable while polling continues and only change when the actual connection status meaningfully changes.

Root cause in `src/pages/dashboard/security-alerts.tsx`: `loadAlerts(..., quiet=true)` set `refreshing=true`, and every background polling/reconnect/focus refresh used `quiet=true`, so automatic work could display the manual Refresh button spinner. The realtime effect also depended on `connectionStatus`, so status changes could tear down/recreate the subscription and polling interval, contributing to repeated fallback-status/message changes.

Smallest UI-only fix applied: added a `manualRefresh` flag so only the button click sets `refreshing`, kept background refreshes silent, changed the page’s initial monitoring state to stable polling fallback, stopped treating mere subscription setup as “live,” and removed `connectionStatus` from the subscription effect dependency while keeping polling active. Page layout, automatic polling, fallback message, alert system, cooldown enforcement, alert creation, staff identity, permissions, business isolation, stamping, and reward redemption were not changed.

Validation completed: `check_for_errors` passed with no CSS, linting, type checking, or server errors. Browser click-through could not be executed from the available toolset in this session, so the user should confirm in the preview that the Refresh button returns to idle after a manual click and that the fallback message stays stable while polling continues. No deployment was performed.

## Checklist
- [x] Inspect the current manual refresh handler, background polling, and connection-status state
- [x] Separate manual refresh loading from background refresh loading
- [x] Stabilize fallback message rendering so polling/reconnect cycles do not cause flashing
- [x] Run project checks and document actual browser verification limits

## Acceptance
The Refresh button returns to idle after manual refresh success or failure, background polling does not show the manual spinner, and the fallback text remains stable while automatic polling continues.