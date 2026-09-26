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
Add a Super Admin notification and review workflow for Business subscription downgrade requests. Reuse the existing Royalty Stamp subscription approval/notification architecture wherever possible. Investigation found there is no general `notifications` table; existing Super Admin operational review already uses `subscription_payments` for pending subscription/payment approvals and `email_logs` only for business registration email delivery. The downgrade notification is therefore represented as a pending `subscription_payments` request with `metadata.kind = "subscription_plan_change"` and `metadata.change_type = "downgrade"`, preserving the existing review queue instead of creating a duplicate notification system. Business Admins can request a downgrade, but the current plan and entitlements remain active until Super Admin approval. Super Admins now see current/requested plan details, pricing, entitlement changes, request time, member/staff counts, and approve/reject actions. Approval records the Super Admin and timestamp, marks the notification approved, applies the requested plan through the existing business `subscription_plan`, updates entitlements without deleting existing customer/card/stamp/reward data, and the Business Billing page shows the resolved request in payment/request history. Rejection preserves the current plan, stores rejection notes, marks the notification rejected, and keeps the request in history. Duplicate pending plan-change requests are blocked.

## Checklist
- [x] Inspect existing subscription change, upgrade approval, notification, and downgrade request architecture
- [x] Identify the existing tables/RPCs/API routes used for pending subscription changes and notifications
- [x] Create or update downgrade request notification creation without duplicating notification systems
- [x] Update Super Admin review UI to show current/requested plan, prices, entitlements, and approve/reject actions
- [x] Implement Super Admin approve/reject handling with authorization, approver metadata, timestamps, and history
- [x] Update Business Billing UI to show pending downgrade request status and prevent duplicate pending requests
- [ ] Verify downgrade approval changes entitlements safely without deleting existing business data
- [ ] Verify existing upgrade approval workflow still works
- [ ] Run project validation and targeted database regression checks

## Acceptance
Business downgrade requests create a clear Super Admin notification and cannot be duplicated while pending.
Super Admin can approve or reject downgrade requests with correct plan/price/entitlement details shown.
Approved downgrades update the subscription through existing rules; rejected downgrades leave the current plan unchanged and notify the Business.