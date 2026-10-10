---
title: Administrative Debug Endpoint Security
status: in_progress
priority: urgent
type: bug
tags: [security, admin, api, supabase]
created_by: agent
created_at: 2026-10-10T16:57:00Z
position: 170
---

## Notes
Phase 2A scope only: inspect and remediate `src/pages/api/admin/debug-rpc.ts` and associated `public.execute_sql_query` RPC permissions. Do not modify unrelated endpoints, authentication flows, Turnstile, SMTP, password recovery, registration, loyalty cards, stamps, rewards, business data, database schemas, or production deployment. Prefer removal if the endpoint has no legitimate production caller. If retained, require explicit method handling, authenticated Super Admin authorization with the existing server helper, and production-safe behavior before any privileged RPC call.

## Checklist
- [ ] Inspect `src/pages/api/admin/debug-rpc.ts` and all callers/references
- [ ] Inspect `public.execute_sql_query` definition and execute grants using read-only metadata
- [ ] Determine whether the debug endpoint is required or can be removed
- [ ] Apply the smallest safe correction to prevent unauthenticated privileged access
- [ ] Verify unauthorized access cannot trigger privileged RPC execution
- [ ] Run TypeScript/lint validation and report actual tests

## Acceptance
Unauthenticated callers cannot access database function definitions or trigger privileged debug RPC execution. Unsupported HTTP methods are rejected or the endpoint is absent. Service-role credentials remain server-side only. No unrelated application behavior is changed.