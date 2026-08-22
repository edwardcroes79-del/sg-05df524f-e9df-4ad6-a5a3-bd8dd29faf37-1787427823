---
title: Business Approval and Royalty Stamp Email Workflow
status: in_progress
priority: high
type: feature
tags: [admin, approval, email, security]
created_by: agent
created_at: 2026-08-22T20:00:00Z
position: 32
---

## Notes
- New businesses register and default to a "pending" status.
- Pending businesses attempting to access the dashboard see "Account Pending Approval".
- Super Admin (297plugins@gmail.com) reviews and approves businesses from the Super Admin panel.
- On approval, a backend API securely updates the status and sends a branded "Royalty Stamp" email via Nodemailer using Titan SMTP credentials.
- The email includes a dynamic button to the production dashboard URL.

## Checklist
- [ ] Inspect database schema for `businesses.status`.
- [ ] Verify/install `nodemailer` for backend email sending.
- [ ] Implement `src/pages/api/admin/approve-business.ts` for secure approval + email.
- [ ] Update Super Admin dashboard to use the new API for approval.
- [ ] Protect the Business Dashboard from pending businesses.
- [ ] Configure SMTP credentials securely in `.env.local`.
- [ ] Test the full approval flow and email.