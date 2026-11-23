---
title: Superadmin notification clearing controls
status: in_progress
priority: high
type: feature
tags: [admin, notifications, management]
created_by: agent
created_at: 2026-11-23T12:41:17Z
position: 294
---
## Notes
Add notification-management controls to the existing Super Admin notification panel only. Reuse the current notification generation, unread tracking, and authorization flow. Clearing notifications must only remove them from the Super Admin notification list, not delete the underlying payment, setup assistance, business, audit, or plan-change records. Cleared notifications must remain cleared after refresh/login and must not reappear from realtime or refresh. Preserve Super Admin-only access.

## Checklist
- [x] Inspect the existing Super Admin notification panel UI, unread/read persistence, and any notification refresh/realtime logic
- [x] Add Clear All and Clear Read controls with confirmation dialog using the existing admin notification system
- [x] Add optional per-notification clear control if the existing panel structure supports it cleanly
- [x] Persist cleared notification state so cleared items stay hidden after refresh/login and do not reappear from recomputed notification lists
- [x] Keep authorization limited to Super Admins and avoid deleting underlying records
- [ ] Verify Clear All, Clear Read, and individual clear behavior without affecting the underlying requests or business data

## Acceptance
Cleared Super Admin notifications disappear immediately and stay cleared after refresh/login.
Underlying payment, setup assistance, and plan-change records remain unchanged.
Unread notifications are preserved unless Clear All or individual clear is used.