---
title: Corporate analytics dashboard
status: done
priority: high
type: feature
tags: [corporate-plan, analytics, dashboard, ui]
created_by: agent
created_at: 2026-10-07T13:55:56Z
position: 133
---

## Notes
Phase 3 dashboard implementation is complete for Corporate-only Advanced Analytics. The dashboard uses the existing Business Dashboard structure and does not redesign unrelated sections. It consumes the existing authenticated Corporate analytics API and displays only real server-calculated data.

Files changed:
- `src/pages/dashboard/analytics.tsx`
- `src/components/dashboard/DashboardLayout.tsx`

Implemented UI:
- Corporate-only Advanced Analytics navigation item.
- Overview KPI cards for total customers, active customers, new customers, returning customers, stamps issued, rewards earned, rewards redeemed, and redemption rate.
- Customer analytics for new, active, returning, at-risk, inactive, never returned, and cross-location customers.
- Location performance section with customers, new customers, active customers, stamps, rewards, redemptions, retention, and activity.
- Program performance section with members, stamps, completion rate, rewards earned/redeemed, and redemption rate.
- Quick QR analytics section with token and stamp activity.
- Cross-location analytics section with multi-location customers and activity distribution.
- Royalty Insights generated from actual calculated metrics only.
- Date filters for 7 days, 30 days, 90 days, 12 months, and custom range.
- Location filters for corporate-wide and individual location views.
- Clear loading, error, and empty states.

Access behavior:
- Dashboard navigation is visible only for Corporate plan businesses.
- Server-side API/RPC enforcement remains the source of truth; UI hiding is not relied on for security.
- Lower plans do not receive Advanced Analytics access.

Validation:
- Project validation passed with no CSS, linting, TypeScript, or server errors.
- Entitlement verification confirmed Corporate-only access and no lower-plan Advanced Analytics entitlement.

## Checklist
- [x] Add Corporate-only analytics dashboard route and navigation
- [x] Add KPI cards, charts-style visual summaries, tables, filters, and empty states
- [x] Add date filters including custom range
- [x] Add location filters and Corporate-wide view
- [x] Add Quick QR, program, location, cross-location, and insight sections
- [x] Preserve unrelated dashboard sections and lower-plan behavior
- [x] Validate project and entitlement isolation

## Acceptance
Corporate users can view Advanced Analytics from real server-side data.
Lower plans cannot see or access Corporate Analytics.
Dashboard updates accurately based on date and location filters.