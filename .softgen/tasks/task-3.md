---
title: Phase 3 - Business Dashboard & Loyalty Programs
status: in_progress
priority: urgent
type: feature
tags: [dashboard, loyalty-programs, crud, analytics]
created_by: agent
---

## Notes
- Build a business dashboard showing real data from Supabase.
- No fake data allowed. Empty states should display if no data exists.
- Implement CRUD for loyalty programs (Create, Edit, Pause/Activate, Delete).
- Ensure strict tenant isolation (actions tied to business_id).

## Checklist
- [ ] Create Dashboard Layout (Sidebar, TopNav).
- [ ] Implement Dashboard Overview (`/dashboard`) with real Supabase metrics.
- [ ] Implement Loyalty Programs List (`/dashboard/programs`).
- [ ] Implement Loyalty Program Creation (`/dashboard/programs/new`).
- [ ] Implement Loyalty Program Editing (`/dashboard/programs/[id]`).
- [ ] Test CRUD operations (verify RLS compliance).

## Acceptance
- Dashboard metrics accurately reflect the current business's data.
- User can create, edit, activate, pause, and delete loyalty programs.
- All numbers come from Supabase.
- "No data" empty states handle fresh accounts correctly.