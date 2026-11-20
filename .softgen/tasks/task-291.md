---
title: Setup assistance notification security and verification
status: todo
priority: high
type: bug
tags: [setup-assistance, security, rls, verification]
created_by: agent
created_at: 2026-11-20T15:07:58Z
position: 291
---
## Notes
Validate that setup assistance notifications follow existing authorization boundaries. Superadmin can access all setup requests. Business Admin can only access requests and notifications for their own business. Reuse existing RLS and authorization paths, add migrations only if necessary, and verify that email failures do not remove in-app notifications.
## Checklist
- [ ] Inspect schema, RLS, notification tables, and setup assistance access patterns before changing data access
- [ ] Validate server-side permission checks for request reads, status changes, feedback, and notification recipients
- [ ] Add only the minimum schema changes needed for persistent setup assistance notifications and unread tracking
- [ ] Verify realtime persistence, next-login visibility, duplicate prevention, and email failure recording
## Acceptance
Setup assistance notifications are visible only to the correct recipients and survive refresh/login.
Permission checks remain server-enforced and no other business data is exposed.