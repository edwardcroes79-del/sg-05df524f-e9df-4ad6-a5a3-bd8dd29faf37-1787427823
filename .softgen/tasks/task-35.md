---
title: Super Admin Notification for New Business Registration
status: in_progress
priority: high
type: feature
tags: [email, admin, onboarding]
created_by: agent
created_at: 2026-08-22T21:11:56Z
position: 35
---
## Notes:
When a new business registers and is placed in 'pending' status, an email notification must be sent to the Super Admin (297plugins@gmail.com).

## Checklist:
- [ ] Create a secure API route (`/api/admin/notify-registration.ts`) to handle sending the notification via Nodemailer.
- [ ] Implement the branded email template with business details and a link to the Super Admin dashboard.
- [ ] Update `src/pages/onboarding.tsx` to trigger this API route exactly once upon successful business creation.
- [ ] Verify there are no duplicate requests triggered by the frontend.
- [ ] Run `check_for_errors` and deliver the result.