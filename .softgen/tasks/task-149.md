---
title: Royalty Insights translated messages
status: done
priority: high
type: bug
tags: [analytics, i18n, insights]
created_by: agent
created_at: 2026-10-08T12:46:28Z
position: 149
---

## Notes
Fixed the Corporate Advanced Analytics Royalty Insights regression where raw translation keys such as `dashboard.analytics.insights.topLocation` and `dashboard.analytics.insights.topProgram` were displayed to users.

Root cause:
- The Advanced Analytics backend/UI payload could return insight `message_key` values.
- The active i18n catalog did not include the corresponding `dashboard.analytics.insights.*` keys in the dictionaries used by `translate()`.
- Because missing translations safely fall back to the key, the UI rendered raw keys instead of human-friendly messages.

Changes made:
- Added user-friendly Royalty Insights translations for English, Spanish, and Aruba Papiamento.
- Added translated no-data messages for insufficient top-location and top-program activity.
- Preserved dynamic substitution for real backend-calculated values: `location`, `program`, `count`, and `value`.
- Added UI fallback protection so raw `dashboard.analytics.*` keys do not render in Royalty Insights.
- Kept analytics calculations, database logic, location selection, Quick QR, entitlements, pricing, billing, and unrelated features unchanged.

Validation results:
- Targeted translation test passed for English, Spanish, and Papiamento.
- Checked 21 translated key/language combinations.
- Confirmed no checked insight translation returns a raw `dashboard.analytics.*` key or unreplaced `{placeholder}`.
- Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect the active i18n catalog and current Royalty Insights rendering
- [x] Add missing English, Spanish, and Papiamento insight translations
- [x] Ensure raw `dashboard.analytics.*` keys are never displayed in Royalty Insights
- [x] Preserve dynamic value substitution for location, program, stamp count, and selected period
- [x] Verify translated title and description resolve correctly
- [x] Run targeted translation checks and project validation

## Acceptance
Royalty Insights displays friendly translated messages instead of raw translation keys.
Top Location and Top Program messages use real calculated analytics values from the backend payload.
No-data insight states display friendly translated messages in English, Spanish, and Papiamento.