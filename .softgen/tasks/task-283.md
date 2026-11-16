---
title: What's New cleanup and setup assistance announcement
status: done
priority: high
type: chore
tags: [announcements, dashboard, setup-assistance]
created_by: agent
created_at: 2026-11-16T16:45:38Z
position: 283
---
## Notes
Clean up only the existing What's New announcements system and replace all current entries with a single new announcement about Setup Assistance. Preserve the announcement system itself and avoid touching unrelated notifications, customer notifications, audit logs, or any loyalty/stamping flows. Inspect the actual implementation and database structure before deleting data. Reuse the current What's New layout, styling, badge system, and any existing CTA/link mechanism.

Inspection findings:
- The live database schema does not have a dedicated What's New announcements table.
- The only matching table is `super_admin_notification_reads`, which is unrelated to business-facing What's New content and only stores Superadmin read state.
- Search results show the current What's New content is hardcoded in `src/components/dashboard/DashboardLayout.tsx`, with announcement blocks around lines 1075-1280.
- Current visible announcements found in code: Anti-Fraud Protection, Security Alerts, Stamp Correction, New Languages, Quick Issue Stamp, Available Add-ons, and Reward Expiration.
- Translation strings for the What's New system are routed through `src/lib/i18n.ts`, so the replacement announcement must follow the same translation-key pattern.

Cleanup implementation:
- Removed 12 existing hardcoded What's New announcement cards from `src/components/dashboard/DashboardLayout.tsx`.
- Replaced them with one Setup Assistance announcement using the existing sheet layout, New badge styling, and button component.
- The CTA now links to `/dashboard/settings`, where Setup Assistance already exists.
- No database rows were deleted because the announcement system is hardcoded UI content, not a database-backed table.
- Unrelated notifications, customer notices, audit logs, and business data were not touched.

## Checklist
- [x] Inspect the What's New UI, announcement data source, and live database schema used by the announcements system
- [x] Remove only the existing What's New announcement entries and count how many were removed
- [x] Add the new "Introducing Setup Assistance!" announcement with New category, provided description, highlights, and CTA
- [x] Link the CTA to the existing Business Settings page if the current system supports clickable actions
- [x] Validate that only the new Setup Assistance announcement remains and the What's New section still loads correctly

## Acceptance
Only one What's New announcement is displayed, and it is the new Setup Assistance entry.
The New badge displays correctly and the CTA points to the Business Settings page when the current system supports links.
Unrelated notifications, customer notices, audit logs, and business data remain untouched.