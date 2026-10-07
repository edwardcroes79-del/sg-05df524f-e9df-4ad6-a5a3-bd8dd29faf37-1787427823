---
title: Quick QR restore for existing plans
status: in_progress
priority: urgent
type: bug
tags: [quick-qr, supabase, rpc, regression]
created_by: agent
created_at: 2026-10-07T17:55:48Z
position: 143
---

## Notes
Restore-only scope after confirmed development regression: Quick QR is broken for existing non-Corporate plans and customer scan shows `QR unavailable` with `public.loyalty_program_available_at_location(uuid, uuid, uuid) does not exist`.

Root cause identified:
- The Corporate/location build introduced a required `loyalty_program_available_at_location(...)` dependency into the Quick QR customer scan RPC path.
- Existing non-Corporate Quick QR did not require location validation.
- The rendered admin Quick QR page was also changed to pass Corporate active-location arguments.
- Restore-only fix must preserve the original flow: business admin generates QR for an active loyalty program; customer scans; business/program are identified; membership/eligibility are checked by the existing scan RPCs; stamp is issued and saved.

Do not work on Corporate Quick QR, location-specific QR, Advanced Analytics, Locations, Staff assignments, branding, translations, billing, pricing, or unrelated features during this restore.

## Checklist
- [x] Trace current admin Quick QR page and customer scan route
- [x] Identify Corporate/location dependency that regressed existing plans
- [x] Restore admin Quick QR token generation to original non-location RPC arguments
- [x] Restore compatibility RPC to original active-program ownership validation for existing Quick QR
- [ ] Apply database restore to connected development Supabase and reload PostgREST schema
- [ ] Verify Quick QR RPCs exist with compatible signatures and execute permissions
- [ ] Run app validation
- [ ] Verify existing non-Corporate Quick QR scan flow with a real enabled business/customer session
- [ ] Report root cause, restored behavior, database/RPC changes, files changed, security/RLS impact, and test result

## Acceptance
Existing non-Corporate Quick QR no longer fails with `loyalty_program_available_at_location(...) does not exist`.
Customer scan page loads the business/program context for a valid Quick QR token.
A real customer can receive a stamp and the stamp is saved successfully for an existing Quick QR-enabled non-Corporate business.