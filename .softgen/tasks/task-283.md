---
title: What's New cleanup and setup assistance announcement
status: in_progress
priority: high
type: chore
tags: [announcements, dashboard, setup-assistance]
created_by: agent
created_at: 2026-11-16T16:45:38Z
position: 283
---
## Notes
Clean up only the existing What's New announcements system and replace all current entries with a single new announcement about Setup Assistance. Preserve the announcement system itself and avoid touching unrelated notifications, customer notifications, audit logs, or any loyalty/stamping flows. Inspect the actual implementation and database structure before deleting data. Reuse the current What's New layout, styling, badge system, and any existing CTA/link mechanism.

## Checklist
- [ ] Inspect the What's New UI, announcement data source, and live database schema used by the announcements system
- [ ] Remove only the existing What's New announcement entries and count how many were removed
- [ ] Add the new "Introducing Setup Assistance!" announcement with New category, provided description, highlights, and CTA
- [ ] Link the CTA to the existing Business Settings page if the current system supports clickable actions
- [ ] Validate that only the new Setup Assistance announcement remains and the What's New section still loads correctly

## Acceptance
Only one What's New announcement is displayed, and it is the new Setup Assistance entry.
The New badge displays correctly and the CTA points to the Business Settings page when the current system supports links.
Unrelated notifications, customer notices, audit logs, and business data remain untouched.