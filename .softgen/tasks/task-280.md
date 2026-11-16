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

## Notes
Implement Phase 1 of the Royalty Stamp Setup Assistance feature only. Add a Business Settings section where an authenticated business administrator can request setup assistance for their own business, see the latest request status, and be blocked from creating duplicate active requests while a request is Pending or Accepted. Add a Setup Requests section inside the existing Superadmin dashboard to list, review, accept, and decline requests, including historical declined/completed entries. Reuse the existing authentication, businesses, business-user relationships, dashboard structure, UI components, and permissions. Keep this separate from any future remote workspace. Do not modify Issue Stamp, Quick Issue Stamp, loyalty records, customer registration, billing, contracts, or unrelated Superadmin features. Use Supabase with RLS and server-side authorization. If no suitable existing table exists, create a dedicated setup assistance requests table with appropriate foreign keys, timestamps, indexes, and constraints. Business administrators must only create/view their own business requests and must never submit requests for another business. Superadmin can manage all requests but accepting/declining only changes request status in this phase.

## Checklist
- [x] Inspect existing Business Settings page, Superadmin dashboard sections, auth/business resolution patterns, and live database schema for reusable structure
- [x] Add database support for setup assistance requests with statuses, timestamps, foreign keys, duplicate-active-request protection, and RLS
- [x] Add Business Admin API support to create and list the authenticated business's setup assistance requests
- [x] Add Superadmin API support to list all setup assistance requests and update Pending requests to Accepted or Declined
- [x] Add Business Settings UI section "Setup Assistance" with description, confirmation dialog, request button, success feedback, and current/latest status display
- [x] Add Superadmin dashboard section "Setup Requests" with request table, history visibility, and accept/decline actions
- [ ] Validate permissions, duplicate-active-request prevention, and non-regression for existing stamp flows

## Acceptance
- A business administrator can request setup assistance only for their own business and can see the current request status in Business Settings.
- A business with a Pending or Accepted request cannot create another active request, while Declined or Completed requests allow a new submission.
- Superadmin can view all setup assistance requests and accept or decline Pending requests from the existing Superadmin dashboard.