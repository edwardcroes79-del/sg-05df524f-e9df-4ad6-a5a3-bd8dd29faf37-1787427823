---
title: Fix Corporate Location Management 403 Error
status: in_progress
priority: high
type: bug
tags: [dashboard, api, locations]
created_by: agent
created_at: 2026-11-10T13:00:00Z
position: 272
---

## Notes
- Investigate 403 error: "Corporate location management is not enabled for this business." on `GET /api/business/locations`.
- Perform read-only investigation first.
- Apply minimal fix to prevent unnecessary frontend calls or gracefully handle them without breaking existing features.
- Protect database, RLS, Stamp Flow, Quick Stamp, and subscriptions.

## Checklist
- [ ] Identify frontend component triggering the request.
- [ ] Inspect backend route for 403 logic.
- [ ] Determine how to check feature toggle on frontend before requesting, or handle gracefully.
- [ ] Apply minimal fix to stop unnecessary 403 logs/errors.
- [ ] Verify functionality.

## Acceptance
- No 403 console errors for businesses without corporate locations.
- Single-location businesses work normally.
- Corporate location businesses retain functionality.