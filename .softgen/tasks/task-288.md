---
title: Superadmin setup assistance notifications
status: in_progress
priority: urgent
type: feature
tags: [setup-assistance, notifications, superadmin, email]
created_by: agent
created_at: 2026-11-20T15:07:58Z
position: 288
---
## Notes
Implement additive notifications for new Setup Assistance requests by reusing the existing request, approval, notification bell, unread count, dashboard, email, and realtime systems. Notifications must persist across refresh/login, avoid duplicates, show business name, requester email, submission date, include a View Request action, and surface new-request counts on the Superadmin dashboard.
## Checklist
- [x] Inspect existing setup assistance submission flow, admin dashboard notification bell/count, in-app notification storage, realtime subscriptions, and email delivery path
- [x] Reuse or extend existing notification persistence for new setup assistance request events without duplicating records
- [x] Show business name, requester email, submission date, unread count updates, and View Request action in Superadmin notification surfaces
- [x] Surface the number of new setup assistance requests on the Superadmin dashboard using existing dashboard data patterns
- [x] Send setup assistance request emails through the existing email system and retain in-app notifications if email delivery fails
## Acceptance
A newly submitted setup assistance request appears in Superadmin notifications immediately, persists after refresh/login, increments unread counts, and links to the request.
The Superadmin dashboard shows the number of new setup assistance requests without breaking existing admin flows.