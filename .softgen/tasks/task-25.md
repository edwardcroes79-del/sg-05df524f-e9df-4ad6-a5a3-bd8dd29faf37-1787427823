---
title: Staff QR Codes - View Only
status: in_progress
priority: urgent
type: feature
tags: [phase-staff-qr, qr-codes, role-permissions]
created_by: agent
created_at: 2026-08-20T16:15:00Z
position: 25
---

## Notes
- Staff must only be able to view existing QR codes & Posters created by the Business Admin/Owner under **Staff Dashboard -> QR Codes -> QR Codes & Posters** (`src/pages/dashboard/qr.tsx`).
- Staff can open/download/print the existing QR codes.
- Staff must NOT be able to create, edit, delete, or modify QR codes (hide buttons/actions and block on server/client).
- Ensure correct business isolation is maintained using real Supabase data and existing RLS on `qr_codes`.

## Checklist
- [ ] Open `src/pages/dashboard/qr.tsx` and inspect user role and context loading
- [ ] Update UI on the QR codes page to conditionally hide/disable Create, Edit, Delete actions for Staff role
- [ ] Verify that Staff can view the exact same business QR codes as the Owner/Admin
- [ ] Inspect and verify Supabase RLS policies for `qr_codes` table to ensure SELECT is allowed for Staff and WRITE is blocked
- [ ] Run build and check for errors
- [ ] Deliver short summary and wait for instructions