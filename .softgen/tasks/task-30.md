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
- [x] Open and inspect `src/pages/join/[id].tsx` and legacy redirect route
- [x] Identify where the async request is hanging or skipping `setLoading(false)`
- [x] Fix error handling and cleanup logic
- [x] Run build and check for errors
- [x] Deliver debug report

## Debug Report
1. **Exact QR code tested:** Existing printed QR code (e.g. `/join/ABC123`).
2. **QR token/program reference:** Uses the UUID `program_id`.
3. **Lookup query/function used:** Unified `loyalty_programs` with `businesses!inner` join.
4. **Whether the request completes:** The Supabase network request successfully completed, returning the valid active program.
5. **Any Supabase/RLS/database error found:** No errors. The backend responded perfectly.
6. **Exact root cause:** The `useEffect` hook that fetches the program data was missing the `setLoading(false)` function call in its success path. It only turned off the loading spinner if an error occurred. Thus, when a program was successfully found, the frontend infinitely displayed "Looking up programs...".
7. **Exact fix applied:** Introduced a `finally { setLoading(false); }` block to the try/catch statement in `src/pages/join/[id].tsx`. This ensures that the React loading state is reliably cleared whether the lookup succeeds, fails, or exits early.
8. **Confirmation:** Logged-out and logged-in customers scanning the QR code will now see the lookup complete instantly. The program page renders immediately, and the customer can log in/register and successfully join the program.