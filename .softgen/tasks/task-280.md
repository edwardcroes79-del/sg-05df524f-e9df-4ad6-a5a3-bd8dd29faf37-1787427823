---
title: Setup assistance request system
status: in_progress
priority: urgent
type: feature
tags: [business-settings, superadmin, support]
created_by: agent
created_at: 2026-11-16T15:17:22Z
position: 280
---

## Checklist
- [x] Inspect existing Business Settings page, Superadmin dashboard sections, auth/business resolution patterns, and live database schema for reusable structure
- [x] Add database support for setup assistance requests with statuses, timestamps, foreign keys, duplicate-active-request protection, and RLS
- [x] Add Business Admin API support to create and list the authenticated business's setup assistance requests
- [x] Add Superadmin API support to list all setup assistance requests and update Pending requests to Accepted or Declined
- [x] Add Business Settings UI section "Setup Assistance" with description, confirmation dialog, request button, success feedback, and current/latest status display
- [x] Add Superadmin dashboard section "Setup Requests" with request table, history visibility, and accept/decline actions
- [x] Validate permissions, duplicate-active-request prevention, and non-regression for existing stamp flows
- [x] Fix Setup Requests "Requested by" to show the actual submitting user instead of "Unknown user"
- [ ] Verify new and existing setup assistance requests resolve requester display name from full name or email
- [x] Regression: prevent Business Settings from triggering `/api/business/corporate-branding` when the current business is not allowed to access Corporate Branding
- [x] Regression: validate `/dashboard/settings` no longer emits the reported 403 network error