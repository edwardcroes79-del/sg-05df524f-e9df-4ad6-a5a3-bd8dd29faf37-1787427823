---
title: QR view page role regression fix
status: done
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
- Git comparison against the prior version confirmed this behavior was introduced in commit `3bf2b85` and did not exist in the earlier public-preview implementation.

Restoration approach:
- Kept View Page targeting the same public join route.
- Restored public preview behavior by preventing auto-join for Business Admin, staff, and Super Admin sessions.
- Limited join actions on the public page to real customer accounts only.
- Preserved normal customer QR enrollment and card-opening behavior for actual customer accounts.
- Kept all business/customer roles, sessions, and dashboards unchanged.

Validation:
- `check_for_errors` passed with no CSS, lint, TypeScript, or runtime errors.
- Code-path validation confirms Business Admin preview no longer reaches `ensureCustomerJoinForProgram(...)` or the `/customer/cards` redirect path.
- Live browser verification as an actual Business Admin still needs to be confirmed in the preview.

## Checklist
- [x] Inspect the current View Page handler and route target
- [x] Compare the relevant QR/public page files against the last working git version
- [x] Identify the exact redirect or role-handling regression
- [x] Restore the original Business Admin preview behavior with minimal changes
- [x] Validate no customer profile or role/session mutation occurs from previewing
- [x] Run check_for_errors

## Acceptance
Business Admin View Page opens the correct public loyalty page for the selected program.
The Business Admin remains a Business Admin and is not redirected to the customer dashboard or enrolled as a customer.