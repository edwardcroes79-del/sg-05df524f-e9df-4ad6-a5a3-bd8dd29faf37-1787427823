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

## Checklist
- [ ] Open the customer auth page and confirm the duplicate `User` imports
- [ ] Apply the smallest TypeScript-safe import fix
- [ ] Validate with a full build-ready error check
- [ ] Record the exact root cause and resolution

## Acceptance
Vercel build no longer fails on `Duplicate identifier 'User'`.
No auth flow or page behavior changes beyond the import/type fix.