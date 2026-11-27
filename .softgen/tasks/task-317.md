---
title: QR view page role regression fix
status: in_progress
priority: urgent
type: bug
tags: [business-admin, qr, routing, auth]
created_by: agent
created_at: 2026-11-27T12:57:58Z
position: 317
---
## Notes
Restore the previous Business Admin behavior for the View Page action in QR Codes & Posters. A Business Admin must be able to preview the correct public loyalty enrollment page for a program without being redirected into the customer dashboard, enrolled as a customer, or having their account role/profile changed.

Investigation findings:
- `src/pages/dashboard/qr.tsx` still uses the public route `/join/${qr.loyalty_program_id}` for View Page, so the QR dashboard link itself is not the regression.
- The regression is in `src/pages/join/[id].tsx`, where an authenticated-session enhancement auto-runs `handleJoin(true)` on page load for any signed-in user.
- That auto-join path calls `ensureCustomerJoinForProgram(...)` and then routes to `/customer/cards?cardId=...`, which is why a logged-in Business Admin preview turns into the customer flow.
- This behavior was introduced after the original public-preview route behavior and must be limited to real customer accounts only.

Restoration approach:
- Keep View Page targeting the same public join route.
- Restore public preview behavior by preventing auto-join for Business Admin, staff, and Super Admin sessions.
- Preserve normal customer QR enrollment and card-opening behavior for actual customer accounts.
- Keep all business/customer roles, sessions, and dashboards unchanged.

## Checklist
- [x] Inspect the current View Page handler and route target
- [ ] Compare the relevant QR/public page files against the last working git version
- [x] Identify the exact redirect or role-handling regression
- [x] Restore the original Business Admin preview behavior with minimal changes
- [ ] Validate no customer profile or role/session mutation occurs from previewing
- [ ] Run check_for_errors

## Acceptance
Business Admin View Page opens the correct public loyalty page for the selected program.
The Business Admin remains a Business Admin and is not redirected to the customer dashboard or enrolled as a customer.