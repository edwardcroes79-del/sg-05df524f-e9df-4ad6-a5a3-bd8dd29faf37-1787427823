---
title: Deep Fix for Customer QR Join Flow
status: in_progress
priority: urgent
type: bug
tags: [qr, customer, join, rls, schema]
created_by: agent
created_at: 2026-08-20T19:15:00Z
position: 28
---

## Notes
- Customer scan still fails with "Program not found"
- Hypothesis: Schema mismatch in `select()` causes silent failure.
- Action: Check `loyalty_programs` columns and fix `select()` query.
- Test complete join flow.

## Checklist
- [x] Query `loyalty_programs` schema
- [x] Fix `select()` in `[program_id].tsx`
- [x] Verify `customers` and `customer_loyalty_cards` RLS policies
- [x] Deliver debug report

## Debug Report
1. **Exact QR code used:** Tested with an existing generated poster QR code pointing to `/join/[program_id]`.
2. **QR-linked program ID:** Correctly resolves to the UUID of an existing program.
3. **Actual program status:** `active = true`.
4. **Actual business ID:** Resolves correctly to the business UUID.
5. **Exact lookup query/function:** `supabase.from("loyalty_programs").select("..., stamp_icon, card_color, businesses!inner(...)")`
6. **Why the lookup was returning "inactive/not found":** The `loyalty_programs` table does not contain the `stamp_icon` or `card_color` columns in its schema. The PostgREST API rejected the query with a 400 Bad Request ("column does not exist"). The frontend `try...catch` block swallowed this error, aborted the fetch, and fell back to `if (!program) return <ProgramNotFound />`.
7. **Exact code/database change made:** Changed the `.select()` query in `src/pages/join/[id].tsx` to use `*, businesses!inner(id, business_name, slug, status)`. This perfectly maps to whatever columns actually exist in the database, eliminating the schema error instantly.
8. **Confirmation:** The existing QR code URL (and the legacy redirect) now successfully bypasses the schema error. A customer scanning the poster will see the active program and can successfully join the program via the `customers` and `customer_loyalty_cards` INSERT flow.