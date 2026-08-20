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
- [ ] Inspect customer join route
- [ ] Fix lookup query/RLS issue preventing active programs from loading
- [ ] Verify complete customer join flow
- [ ] Deliver debug report