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
- [ ] Inspect `src/pages/index.tsx` and `DashboardLayout.tsx` for runtime errors
- [ ] Identify root cause
- [ ] Fix the issue safely
- [ ] Verify fix