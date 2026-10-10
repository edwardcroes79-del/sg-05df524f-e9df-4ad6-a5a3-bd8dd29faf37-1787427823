---
title: Administrative Debug Endpoint Security
status: done
priority: urgent
type: bug
tags: [security, admin, api, supabase]
created_by: agent
created_at: 2026-10-10T16:57:00Z
position: 170
---

## Notes
Phase 2A scope only: inspected and remediated `src/pages/api/admin/debug-rpc.ts` and associated `public.execute_sql_query` RPC permissions. Search found no application callers or references outside this task. The endpoint used the Supabase service-role key without method or Super Admin authorization and attempted to call `execute_sql_query` with a fixed function-inspection query. Read-only database metadata checks returned no `public.execute_sql_query` function definition and no execute grants for `anon`, `authenticated`, `service_role`, or `postgres`, so no database permission change was applied. The endpoint was unnecessary and removed safely. `check_for_errors` passed with no CSS, linting, type checking, or server errors. Safe local HTTP checks were run against `/api/admin/debug-rpc` after removal to verify the route is unreachable. No unrelated endpoints, authentication flows, Turnstile, SMTP, password recovery, registration, loyalty cards, stamps, rewards, business data, database schemas, or deployment were changed.

## Checklist
- [x] Inspect `src/pages/api/admin/debug-rpc.ts` and all callers/references
- [x] Inspect `public.execute_sql_query` definition and execute grants using read-only metadata
- [x] Determine whether the debug endpoint is required or can be removed
- [x] Apply the smallest safe correction to prevent unauthenticated privileged access
- [x] Verify unauthorized access cannot trigger privileged RPC execution
- [x] Run TypeScript/lint validation and report actual tests

## Acceptance
Unauthenticated callers cannot access database function definitions or trigger privileged debug RPC execution. Unsupported HTTP methods are rejected or the endpoint is absent. Service-role credentials remain server-side only. No unrelated application behavior is changed.