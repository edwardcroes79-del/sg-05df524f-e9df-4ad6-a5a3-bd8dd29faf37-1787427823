---
title: Fix Customer QR Scan to Join Flow
status: in_progress
priority: urgent
type: bug
tags: [qr, customer, join, rls]
created_by: agent
created_at: 2026-08-20T19:05:00Z
position: 27
---

## Notes
- Customer scans QR code -> gets "Program not found or is inactive" despite program being active.
- Need to check `src/pages/join/[business_slug]/[program_id].tsx` lookup query.
- Make sure customer can actually login/register and join the program.

## Checklist
- [x] Inspect customer join route
- [x] Fix lookup query/RLS issue preventing active programs from loading
- [x] Verify complete customer join flow
- [x] Deliver debug report

## Debug Report
- **Root Cause:** Some generated QR codes included `undefined` or a missing value for the `business_slug` because the business hadn't configured a custom slug. The customer join page was trying to find the business using `.eq('slug', 'undefined')`, which returned 0 rows and caused the entire page to fail with "Program not found" even though the program was active.
- **Fix:** Refactored the data fetching logic to query the `loyalty_programs` table first using the globally unique `program_id`. Once the program is found, the page uses the program's actual `business_id` to reliably fetch the business details. 
- **Result:** Existing QR codes (even those with `/join/undefined/...`) now successfully resolve to the correct active program. The customer join flow handles existing and new customers gracefully without `.single()` crashing.