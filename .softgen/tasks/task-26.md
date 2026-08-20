---
title: Fix QR Code Program Not Found Error
status: in_progress
priority: urgent
type: bug
tags: [qr, customer, loyalty-program]
---

## Notes
- Customer scans QR code for an active program but gets "Program not found or is inactive".
- The program is not deleted and is active in the dashboard.
- Need to trace QR Code -> URL -> Route -> Supabase Query -> RLS.
- Do NOT regenerate valid QR codes.
- Fix the root cause (likely RLS blocking unauthenticated reads or wrong status check).

## Checklist
- [x] Inspect `src/pages/join/[business_slug]/[program_id].tsx`
- [x] Check schema and RLS for `loyalty_programs`
- [x] Check schema and RLS for `businesses`
- [x] Fix the lookup logic / RLS
- [x] Deliver debug report

## Debug Report
- **Root Cause:** Row Level Security (RLS) policies on `businesses` and `loyalty_programs` were strictly limited to Business Owners and Staff. Public customers scanning the QR code were denied `SELECT` access, causing the database to return 0 rows for perfectly active programs, triggering the "not found" error.
- **Fix:** Implemented `businesses_public_read_active` (allowing `status = 'active'`) and `loyalty_programs_public_read_active` (allowing `active = true`).
- **Result:** Existing QR codes work immediately. Customers can view active programs, but RLS continues to block access to paused/inactive/deleted programs. No QR code regeneration is needed.