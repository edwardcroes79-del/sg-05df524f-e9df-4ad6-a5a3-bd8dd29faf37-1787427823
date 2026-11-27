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

Confirmed evidence from the current files:
- `src/components/ui/card.tsx` was updated so `CardDescription` now renders a `div` instead of a paragraph-style wrapper.
- `src/pages/admin/index.tsx` uses `CardDescription` for rich admin content in several live sections, including line ranges reported by search at `4232-4242`, `4565-4567`, `4721-4723`, `4808-4810`, `5061-5063`, `5793-5806`, and `6191-6193`.
- Those sections include block-level descendants and are consistent with the reported `/admin` hydration error: `dom nesting violation: <p> cannot appear as a descendant of <p>`.

Current fix status:
- The shared card description wrapper is now valid for block content, which is the smallest broad fix for the admin page.
- If the browser still reports hydration mismatch after refresh, the next direct investigation target is `DialogDescription` usage in `src/pages/admin/index.tsx`, where search results also show nested `<p>` blocks in dialog descriptions around `6770-6772`, `6816-6822`, `6874-6884`, and `7165-7168`.

## Checklist
- [x] Locate the `/admin` component branch rendering nested paragraph tags
- [x] Confirm the source component causing hydration mismatch
- [x] Apply the smallest valid-HTML fix
- [ ] Validate with check_for_errors
- [ ] Document the root cause and fix

## Acceptance
The `/admin` page loads without hydration mismatch errors.
The admin page layout and behavior remain unchanged aside from valid HTML structure.