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
- [x] Query pg_proc for can_access_business overloads
- [x] Identify the intended function and obsolete duplicates
- [x] Drop obsolete duplicate functions (consolidated signatures to eliminate default ambiguity)
- [x] Ensure RLS policies still use the correct function
- [x] Verify customer search flow for Admin and Staff
- [x] Deliver debug report