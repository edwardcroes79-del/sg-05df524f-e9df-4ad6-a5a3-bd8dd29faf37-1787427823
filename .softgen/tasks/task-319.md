---
title: Admin hydration mismatch fix
status: in_progress
priority: urgent
type: bug
tags: [admin, hydration, html, ssr]
created_by: agent
created_at: 2026-11-27T17:02:00Z
position: 319
---
## Notes
Investigate the hydration mismatch on `/admin` reporting invalid DOM nesting, specifically `<p>` inside `<p>`. Identify the exact component tree and apply the smallest markup fix without changing admin behavior or layout.

## Checklist
- [ ] Locate the `/admin` component branch rendering nested paragraph tags
- [ ] Confirm the source component causing hydration mismatch
- [ ] Apply the smallest valid-HTML fix
- [ ] Validate with check_for_errors
- [ ] Document the root cause and fix
## Acceptance
The `/admin` page loads without hydration mismatch errors.
The admin page layout and behavior remain unchanged aside from valid HTML structure.