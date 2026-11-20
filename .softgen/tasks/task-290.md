---
title: Setup assistance status change notifications
status: done
priority: urgent
type: feature
tags: [setup-assistance, notifications, workflow, realtime]
created_by: agent
created_at: 2026-11-20T15:07:58Z
position: 290
---

## Notes
Complete the existing Setup Assistance workflow so status transitions notify the correct parties without rebuilding the request, draft, approval, activation, or session systems. Reuse existing email delivery, Supabase-backed persistence, realtime dashboard updates, and secure activation. Business Admins must see active request state and review prompts directly from the main dashboard, while Superadmin must receive immediate in-app visibility for new requests and change requests.

## Checklist
- [x] Reuse existing setup request/status workflow for pending, accepted, ready-for-review, changes-requested, completed, and declined state transitions
- [x] Send Business Admin status emails for ready-for-review and completed transitions without bypassing the existing secure activation RPC
- [x] Notify Superadmin when a Business Admin requests changes and when a setup is approved/completed
- [x] Surface status alerts, review actions, and request history prominently on the Business Dashboard without requiring Settings navigation
- [x] Verify duplicate prevention, persisted notification visibility, and failure-safe email logging for setup status changes

## Acceptance
Business Admins can track setup request progress from the main dashboard, including ready-for-review alerts and direct access to the existing review flow.
Superadmin sees setup request notification changes in-dashboard with realtime updates and persistent unread state after refresh or re-login.
Status emails and in-app notifications follow the existing secure workflow and do not auto-activate drafts without explicit Business Admin approval.