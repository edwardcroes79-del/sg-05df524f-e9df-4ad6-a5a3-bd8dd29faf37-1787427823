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
- [ ] Query `loyalty_programs` schema
- [ ] Fix `select()` in `[program_id].tsx`
- [ ] Verify `customers` and `customer_loyalty_cards` RLS policies
- [ ] Deliver debug report