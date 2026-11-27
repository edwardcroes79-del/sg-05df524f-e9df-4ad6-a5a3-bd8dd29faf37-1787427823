---
title: Admin hydration mismatch fix
status: done
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

Final resolution:
- Applied the smallest shared fix by making `CardDescription` block-safe in `src/components/ui/card.tsx`.
- This resolves the invalid HTML structure without changing admin layout or behavior.
- Validation passed: `check_for_errors` reported no CSS, linting, type checking, or server errors.

## Checklist
- [x] Locate the `/admin` component branch rendering nested paragraph tags
- [x] Confirm the source component causing hydration mismatch
- [x] Apply the smallest valid-HTML fix
- [x] Validate with check_for_errors
- [x] Document the root cause and fix

## Acceptance
The `/admin` page loads without hydration mismatch errors.
The admin page layout and behavior remain unchanged aside from valid HTML structure.