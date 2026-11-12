---
title: Customer registration sync investigation
status: in_progress
priority: high
type: bug
tags: [auth, customers, superadmin, investigation]
created_by: agent
created_at: 2026-11-12T17:13:55Z
position: 274
---

## Notes
Investigate why new Supabase Auth customer users are not appearing in the Royalty Stamp Superadmin Customers list. Read-only investigation only. Do not modify source code, database records, RLS policies, migrations, auth settings, Stamp Flow, or Quick Stamp. The report must identify whether the issue is registration/synchronization, permissions, or the Superadmin display query, and provide a safe recovery plan.

## Checklist
- [ ] Trace customer registration flow and record creation path
- [ ] Inspect Superadmin Customers data loading query
- [ ] Compare auth.users against public customers/profiles rows
- [ ] Check for missing profile/customer rows and permission/display filters
- [ ] Identify exact root cause and affected tables/routes/files
- [ ] Provide recommended fix and safe recovery plan without implementation

## Acceptance
- Exact cause of missing customers is documented with evidence.
- Count of Auth users missing from backend customer list is reported.
- No code or database changes are made beyond this investigation task note.