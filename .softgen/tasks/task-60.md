---
title: Downgrade Approval Notifications
status: in_progress
priority: urgent
type: feature
tags: [billing, subscriptions, notifications, admin-approval]
created_by: agent
created_at: 2026-09-26T22:04:02Z
position: 60
---

## Notes
Add a Super Admin notification and review workflow for Business subscription downgrade requests. Reuse the existing Royalty Stamp subscription approval/notification architecture wherever possible. Business Admins can request a downgrade, but the current plan and entitlements remain active until Super Admin approval. Super Admins must see current/requested plan details, pricing, entitlement changes, request time, and approve/reject actions. Approval records the Super Admin and timestamp, applies or schedules the downgrade according to existing billing-period rules, updates entitlements without deleting existing customer/card/stamp/reward data, and notifies the Business. Rejection preserves the current plan, stores rejection details if supported, notifies the Business, and keeps the request in history. Duplicate pending downgrade requests must be blocked.

## Checklist
- [ ] Inspect existing subscription change, upgrade approval, notification, and downgrade request architecture
- [ ] Identify the existing tables/RPCs/API routes used for pending subscription changes and notifications
- [ ] Create or update downgrade request notification creation without duplicating notification systems
- [ ] Update Super Admin review UI to show current/requested plan, prices, entitlements, and approve/reject actions
- [ ] Implement Super Admin approve/reject handling with authorization, approver metadata, timestamps, and history
- [ ] Update Business Billing UI to show pending/approved/rejected downgrade request status and prevent duplicate pending requests
- [ ] Verify downgrade approval changes entitlements safely without deleting existing business data
- [ ] Verify existing upgrade approval workflow still works
- [ ] Run project validation and targeted database regression checks

## Acceptance
Business downgrade requests create a clear Super Admin notification and cannot be duplicated while pending.
Super Admin can approve or reject downgrade requests with correct plan/price/entitlement details shown.
Approved downgrades update the subscription through existing rules; rejected downgrades leave the current plan unchanged and notify the Business.