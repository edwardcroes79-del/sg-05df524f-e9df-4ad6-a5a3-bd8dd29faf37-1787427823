---
title: Royalty Insights translated messages
status: in_progress
priority: high
type: bug
tags: [analytics, i18n, insights]
created_by: agent
created_at: 2026-10-08T12:46:28Z
position: 149
---

## Notes
The Corporate Advanced Analytics Royalty Insights section is displaying raw translation keys such as `dashboard.analytics.insights.topLocation` and `dashboard.analytics.insights.topProgram`. The fix must keep the existing i18n system as the source of user-facing text, dynamically substitute real analytics values such as location name, program name, and stamp count, and provide friendly no-data messages in English, Spanish, and Aruba Papiamento. Do not change analytics calculations, database logic, location selection, Quick QR, entitlements, pricing, billing, or unrelated features.

## Checklist
- [x] Inspect the active i18n catalog and current Royalty Insights rendering
- [x] Add missing English, Spanish, and Papiamento insight translations
- [x] Ensure raw `dashboard.analytics.*` keys are never displayed in Royalty Insights
- [x] Preserve dynamic value substitution for location, program, stamp count, and selected period
- [x] Verify translated title and description resolve correctly
- [ ] Run targeted translation checks and project validation

## Acceptance
Royalty Insights displays friendly translated messages instead of raw translation keys.
Top Location and Top Program messages use real calculated analytics values from the backend payload.
No-data insight states display friendly translated messages in English, Spanish, and Papiamento.