---
title: Add Anti-Fraud and Security Alerts to What's New
status: in_progress
priority: medium
type: feature
tags: [content, announcements]
created_by: agent
created_at: 2026-10-15T15:35:00Z
position: 228
---

## Notes
Add two announcements to the existing What's New section:
1. Anti-fraud protection (configurable cooldown, owner-controlled, server-side enforcement).
2. Security Alerts (dashboard alerts for blocked attempts, owner access only).

Reuse existing structure and design without altering logic, entitlements, or security controls. Do not deploy.

## Checklist
- [x] Locate the "What's New" section in the codebase
- [x] Add "Anti-fraud protection" announcement following existing patterns
- [x] Add "Security Alerts" announcement following existing patterns
- [x] Run project checks

## Acceptance
The new announcements correctly appear in the business dashboard's "What's New" section with translations, respecting existing structural conventions.