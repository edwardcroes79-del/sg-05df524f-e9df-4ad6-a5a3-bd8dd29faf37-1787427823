---
title: Fix client-side crash on landing page
status: in_progress
priority: urgent
type: bug
tags: [crash, production, index]
created_by: agent
created_at: 2026-10-02T12:00:00Z
position: 108
---

## Notes
Investigate "Application error: a client-side exception has occurred" on royaltystamp.com.

## Checklist
- [x] Inspect `src/pages/index.tsx` and `DashboardLayout.tsx` for runtime errors
- [x] Identify root cause: `plan.max_customers.toLocaleString()` on null database values
- [x] Fix the issue safely by adding optional chaining and null coalescing
- [x] Verify fix by running check_for_errors

## Acceptance
Landing page loads correctly without crashing even if database plans have null values.