---
title: Corporate Branding unavailable state fix
status: done
priority: urgent
type: bug
tags: [corporate, branding, dashboard, runtime]
created_by: agent
created_at: 2026-10-08T14:15:04Z
position: 154
---

## Notes
Fix the runtime crash where Corporate Branding entitlement denial is treated as an exception during normal dashboard loading. Non-Corporate businesses must keep using the dashboard with normal Royalty Stamp branding, and Corporate businesses must load saved branding or defaults. Server-side entitlement protection must remain active; do not expose Corporate Branding UI to lower plans and do not bypass API security.

Root cause: the Corporate Branding API correctly returned a 403 for businesses without the Corporate Branding entitlement, but the frontend helper treated that expected denial as a fatal fetch error. DashboardLayout now receives a structured unavailable state for this known case and keeps the dashboard loading normally while leaving the Corporate Branding UI hidden.

Files changed:
- src/contexts/CorporateBrandingContext.tsx: separates expected feature-unavailable 403 responses from real failures and returns default Royalty Stamp branding for unavailable businesses.
- src/components/dashboard/DashboardLayout.tsx: uses the structured fetch status so lower plans continue loading and Corporate Branding navigation stays hidden unless the backend confirms availability.
- src/pages/api/business/corporate-branding.ts: preserves server-side entitlement protection and returns the known entitlement-denied message for graceful frontend handling.

Test results:
- Project checks passed with no CSS, linting, TypeScript, or runtime errors.
- Lower-plan behavior: entitlement-denied Corporate Branding response is handled as unavailable, dashboard remains usable, and Corporate Branding UI is not exposed.
- Corporate behavior: available status still loads saved branding or defaults.
- Unauthorized/non-Corporate API access remains protected with a 403 response.

## Checklist
- [x] Inspect Corporate Branding context, dashboard loader, and backend API behavior for entitlement-denied responses
- [x] Separate feature-unavailable responses from real server/security failures in the frontend fetch helper
- [x] Update DashboardLayout so Corporate Branding does not block normal dashboard loading or expose UI for unavailable plans
- [x] Verify API entitlement protection remains server-side and lower plans are handled gracefully
- [x] Run project checks and report root cause, files changed, and test results

## Acceptance
Non-Corporate dashboards load without a Corporate Branding runtime error.
Corporate dashboards load saved branding or safe defaults.
Non-Corporate API access remains denied server-side while frontend handles the denial gracefully.