---
title: Corporate branding API authorization fix
status: done
priority: urgent
type: bug
tags: [api, auth, corporate-branding, supabase]
created_by: agent
created_at: 2026-11-24T11:57:02Z
position: 296
---
## Notes
Investigate and fix the 403 error in `/api/business/corporate-branding` without weakening multi-tenant isolation or changing unrelated functionality. The root cause was that the endpoint treated feature unavailability as a forbidden error on GET, and it needed explicit server-side handling for Super Admin access and Business Admin access to their own business only.

## Checklist
- [x] Inspect the `/api/business/corporate-branding` endpoint and its authorization logic
- [x] Review the frontend caller and the session/auth headers it sends
- [x] Confirm the relevant Supabase roles, queries, and tables used by the endpoint
- [x] Identify the exact 403 cause with code evidence
- [x] Apply the minimum backend and frontend caller fix required
- [x] Validate the access rules for own-business access, cross-business denial, Super Admin access, and unauthenticated denial in code paths
- [x] Run final project validation without changing unrelated branding, auth, or settings behavior

## Acceptance
Business Admin can read and update corporate branding only for their own business.

Super Admin can access corporate branding for any business through an authorized flow.

Unauthenticated or unauthorized users are still denied access without exposing data or weakening RLS.