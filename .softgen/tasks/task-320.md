---
title: Customer auth duplicate User build fix
status: in_progress
priority: urgent
type: bug
tags: [vercel, build, auth, typescript]
created_by: agent
created_at: 2026-11-27T17:10:46Z
position: 320
---
## Notes
Fix the Vercel deployment blocker in `src/pages/auth/customer.tsx`. The build log shows a TypeScript duplicate identifier error for `User` caused by conflicting imports. Ignore warnings unless a new blocking error appears.

Confirmed root cause:
- `src/pages/auth/customer.tsx` imports `User` from `lucide-react` for the form icon.
- The same file also imports `User` as a type from `@supabase/supabase-js`.
- TypeScript treats this as a duplicate identifier in the module scope, which blocks `next build` on Vercel.

Resolution applied:
- Alias the Supabase type import to `SupabaseUser`.
- Update the `routeSignedInUser(...)` helper to use the aliased type.
- No auth logic, routing behavior, or UI flow changed.

## Checklist
- [x] Open the customer auth page and confirm the duplicate `User` imports
- [x] Apply the smallest TypeScript-safe import fix
- [ ] Validate with a full build-ready error check
- [ ] Record the exact root cause and resolution

## Acceptance
Vercel build no longer fails on `Duplicate identifier 'User'`.
No auth flow or page behavior changes beyond the import/type fix.