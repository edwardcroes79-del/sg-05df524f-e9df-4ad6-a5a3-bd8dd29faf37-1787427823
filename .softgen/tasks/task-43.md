---
title: Super Admin Customer Deletion
status: in_progress
priority: urgent
type: bug
tags: [admin, customers, auth, deletion]
created_by: agent
created_at: 2026-09-25T18:47:27Z
position: 43
---

## Notes
Investigate and fix the Super Admin customer delete action. The UI currently reports success even when the customer may remain in the database and/or Supabase Auth. Trace the full flow from Super Admin customer management through confirmation, handler, API/RPC/database/Auth deletion, response, and UI refresh. Do not change success messaging without making backend deletion real. Preserve RLS, multi-tenant safety, customer/business isolation, and never expose privileged keys in the browser.

## Checklist
- [ ] Identify the exact current delete flow from Super Admin UI to backend/database/Auth
- [ ] Inspect customer-related tables, foreign keys, RLS policies, and Auth involvement
- [ ] Determine why the UI can report success when deletion does not complete
- [ ] Define the safest minimal deletion strategy for customer profile, Auth user, and customer-owned records
- [ ] Implement only the necessary secure server-side fix
- [ ] Verify backend deletion directly against database/Auth behavior
- [ ] Confirm unrelated customer/business records remain unaffected
- [ ] Run project validation

## Acceptance
Super Admin customer deletion only shows success after backend deletion succeeds.
Deleted customers no longer remain in customer/profile records or searchable customer lists.
Auth deletion is handled securely server-side when the customer is fully removed.
Unrelated business, loyalty program, stamp, reward, and customer data remains intact.