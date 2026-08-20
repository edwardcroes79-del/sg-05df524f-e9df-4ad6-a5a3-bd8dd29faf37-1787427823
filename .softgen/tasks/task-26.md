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
- [ ] Inspect `src/pages/join/[business_slug]/[program_id].tsx`
- [ ] Check schema and RLS for `loyalty_programs`
- [ ] Check schema and RLS for `businesses`
- [ ] Fix the lookup logic / RLS
- [ ] Deliver debug report