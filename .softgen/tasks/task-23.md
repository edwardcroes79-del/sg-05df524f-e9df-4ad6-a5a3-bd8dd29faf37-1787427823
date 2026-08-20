---
title: Fix duplicate can_access_business function error
status: in_progress
priority: urgent
type: bug
tags: [database, rls, functions, issue-stamp]
created_by: agent
created_at: 2026-08-20T15:35:00Z
position: 23
---

## Notes
- "Customer search failed: function public.can_access_business(uuid) is not unique"
- Do not disable RLS or bypass security.
- Identify duplicate functions and consolidate safely.
- Verify Admin/Staff Issue Stamp search works without error.
- Verify stamp issuing still works.

## Checklist
- [ ] Query pg_proc for can_access_business overloads
- [ ] Identify the intended function and obsolete duplicates
- [ ] Drop obsolete duplicate functions
- [ ] Ensure RLS policies still use the correct function
- [ ] Verify customer search flow for Admin and Staff
- [ ] Deliver debug report