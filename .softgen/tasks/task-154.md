---
title: Corporate Branding unavailable state fix
status: in_progress
priority: urgent
type: bug
tags: [corporate, branding, dashboard, runtime]
created_by: agent
created_at: 2026-10-08T14:15:04Z
position: 154
---

## Notes
Fix the runtime crash where Corporate Branding entitlement denial is treated as an exception during normal dashboard loading. Non-Corporate businesses must keep using the dashboard with normal Royalty Stamp branding, and Corporate businesses must load saved branding or defaults. Server-side entitlement protection must remain active; do not expose Corporate Branding UI to lower plans and do not bypass API security.

## Checklist
- [x] Inspect Corporate Branding context, dashboard loader, and backend API behavior for entitlement-denied responses
- [x] Separate feature-unavailable responses from real server/security failures in the frontend fetch helper
- [x] Update DashboardLayout so Corporate Branding does not block normal dashboard loading or expose UI for unavailable plans
- [x] Verify API entitlement protection remains server-side and lower plans are handled gracefully
- [ ] Run project checks and report root cause, files changed, and test results

## Acceptance
Non-Corporate dashboards load without a Corporate Branding runtime error.
Corporate dashboards load saved branding or safe defaults.
Non-Corporate API access remains denied server-side while frontend handles the denial gracefully.