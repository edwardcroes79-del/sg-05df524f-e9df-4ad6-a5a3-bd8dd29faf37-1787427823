---
title: Super Admin Notification Center
status: done
priority: high
type: feature
tags: [admin, notifications, approvals, dashboard]
created_by: agent
created_at: 2026-09-26T22:22:52Z
position: 61
---

## Notes
Created a centralized notification center for the Super Admin panel. Added a notification bell with unread count in the existing Super Admin dashboard/header. Reused existing approval/request architecture and did not change pricing, plan limits, billing logic, approval rules, or business registration logic. Notifications support add-on purchase requests, plan upgrade requests, plan downgrade requests, and new business registrations awaiting approval. Each notification includes type, business name, short description, created time, read/unread state, related request ID, request status, and a Review action that routes to the existing approval/review screen instead of creating duplicate pages. Only authorized Super Admin users can view or act on notifications. A lightweight `super_admin_notification_reads` table stores per-Super-Admin read state only; approval/request data remains sourced from existing `business_addon_subscriptions`, `subscription_payments`, and `businesses` queues. Targeted regression confirmed the read-state table exists, RLS is enabled, policies require `auth.uid()` and `is_super_admin_user(auth.uid())`, Super Admin read-state writes are allowed, non-admin access is blocked when test users exist, notification sources are detectable, and resolved plan-change notifications do not remain pending. Project validation passed.

## Checklist
- [x] Inspect existing Super Admin dashboard/header and current approval queues
- [x] Identify existing data sources for add-on requests, plan upgrades/downgrades, and business registrations
- [x] Add or extend a Super Admin notification data model without duplicating existing approval systems
- [x] Create bell UI with unread badge and notification dropdown/panel
- [x] Mark notifications read when opened or reviewed and keep count updated without full refresh where practical
- [x] Route Review actions to the correct existing approval section/request
- [x] Reflect approved/rejected/cancelled statuses so resolved requests do not remain unresolved
- [x] Verify unauthorized users cannot access Super Admin notifications
- [x] Run project validation and targeted notification workflow regression checks

## Acceptance
Super Admin sees a notification bell with an accurate unread count for pending review actions.
Notification Review buttons open the correct existing approval workflow for add-ons, plan changes, and business registrations.
Resolved requests update notification status, and unauthorized users cannot access Super Admin notifications.