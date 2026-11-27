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

Investigation requirements:
- Inspect the current View Page button and its route target in the QR Codes & Posters surface.
- Compare current behavior against git history to identify the last working implementation before the regression.
- Trace the target public route and any auth-based redirects that may send a logged-in Business Admin into the customer dashboard.
- Make the smallest possible routing or role-handling fix.
- Preserve existing customer enrollment through the public page and preserve all Business Admin dashboard access.

Constraints:
- Do not redesign the QR page.
- Do not change QR generation, validation, loyalty programs, or unrelated auth.
- Do not modify customer dashboards or role architecture beyond the direct regression fix.

## Checklist
- [ ] Inspect the current View Page handler and route target
- [ ] Compare the relevant QR/public page files against the last working git version
- [ ] Identify the exact redirect or role-handling regression
- [ ] Restore the original Business Admin preview behavior with minimal changes
- [ ] Validate no customer profile or role/session mutation occurs from previewing
- [ ] Run check_for_errors

## Acceptance
Business Admin View Page opens the correct public loyalty page for the selected program.
The Business Admin remains a Business Admin and is not redirected to the customer dashboard or enrolled as a customer.