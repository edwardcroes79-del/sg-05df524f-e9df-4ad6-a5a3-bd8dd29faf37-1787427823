---
title: Setup assistance status change notifications
status: in_progress
priority: urgent
type: feature
tags: [setup-assistance, notifications, workflow, realtime]
created_by: agent
created_at: 2026-11-20T15:07:58Z
position: 290
---
## Notes
Wire Business Admin and Superadmin notifications into the existing setup assistance review workflow. Status changes must notify the correct party with business name, request reference, date, status, and request link. Draft review must reuse the existing preview/approval process, never activate without explicit approval, preserve approval history, and notify both sides for draft sent, changes requested, revised submission, approval, completion, and decline.
## Checklist
- [x] Reuse existing setup request/status workflow for pending, accepted, ready-for-review, changes-requested, completed, and declined state transitions
- [x] Send Business Admin status emails for ready-for-review and completed transitions without bypassing the existing secure activation RPC
- [x] Notify Superadmin when a Business Admin requests changes and when a setup is approved/completed
- [ ] Surface status alerts, review actions, and request history prominently on the Business Dashboard without requiring Settings navigation
- [ ] Verify duplicate prevention, persisted notification visibility, and failure-safe email logging for setup status changes
## Acceptance
Status changes produce the correct persistent in-app notifications, realtime updates, and emails without duplicate records.
Draft approval continues through the existing secure activation workflow and never auto-activates without Business Admin approval.