---
title: Setup assistance status change notifications
status: todo
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
- [ ] Inspect existing setup session, draft preview, approval, change request, activation, and setup review server flows
- [ ] Reuse existing database/email/realtime systems for Pending, Accepted, Ready for Review, Changes Requested, Completed, and Declined notifications
- [ ] Add dashboard alert and Review My Setup action when a draft is ready for review
- [ ] Notify Superadmin when Business Admin requests changes and notify Business Admin when revised drafts are submitted
- [ ] Preserve approval history and enforce explicit approval before activation using existing secure activation logic
## Acceptance
Status changes produce the correct persistent in-app notifications, realtime updates, and emails without duplicate records.
Draft approval continues through the existing secure activation workflow and never auto-activates without Business Admin approval.