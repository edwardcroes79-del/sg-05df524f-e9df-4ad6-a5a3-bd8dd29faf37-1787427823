---
title: Corporate analytics dashboard
status: todo
priority: high
type: feature
tags: [corporate-plan, analytics, dashboard, ui]
created_by: agent
created_at: 2026-10-07T13:47:05Z
position: 133
---

## Notes
Build the Corporate-only Advanced Analytics dashboard UI using the backend API from Phase 3. Match the existing Business Dashboard style and avoid redesigning unrelated dashboard sections. No mock data. Show useful empty states when real data is absent. Include KPI cards, charts/tables, date filters, location filters, Corporate vs location views, location comparison, program performance, Quick QR analytics, cross-location analytics, and Royalty Insights generated only from calculated metrics.

## Checklist
- [ ] Add Corporate-only analytics page and navigation entry without changing lower-plan dashboard behavior
- [ ] Add date filters for 7 days, 30 days, 90 days, 12 months, and custom range
- [ ] Add location filter for Corporate-wide and permitted individual locations
- [ ] Render overview, customer analytics, location performance, program performance, Quick QR analytics, cross-location analytics, trends, and insights from real API data
- [ ] Show clear loading, error, unauthorized, and empty states
- [ ] Ensure completed UI is responsive for desktop and mobile
- [ ] Run project validation and regression checks

## Acceptance
Corporate users can view Advanced Analytics from real backend data.
Lower-plan users do not see or access Corporate Analytics.
Dashboard updates accurately based on date and location filters.