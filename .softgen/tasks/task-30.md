---
title: Fix Infinite Loading on QR Join Page
status: in_progress
priority: urgent
type: bug
tags: [qr-codes, join-flow, customer, bug-fix]
created_by: agent
created_at: 2026-08-20T19:43:00Z
position: 30
---

## Notes
- Users scanning existing QR codes are stuck on "Looking up programs..."
- Need to trace `src/pages/join/[id].tsx` and `src/pages/join/[id]/[program_id].tsx`
- Ensure `router.isReady` logic and Supabase async queries are properly handling errors and clearing loading state
- Must support logged-out users

## Checklist
- [ ] Open and inspect `src/pages/join/[id].tsx` and legacy redirect route
- [ ] Identify where the async request is hanging or skipping `setLoading(false)`
- [ ] Fix error handling and cleanup logic
- [ ] Run build and check for errors
- [ ] Deliver debug report