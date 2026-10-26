---
title: Royalty Scratch & Win enhanced builder prototype
status: done
priority: medium
type: feature
tags: [scratch-win, prototype, campaign-builder]
created_by: agent
created_at: 2026-10-26T12:53:43Z
position: 242
---

## Notes
Enhance Royalty Scratch & Win with a separate standalone guided campaign builder prototype using new files only. Existing Scratch & Win files, routes, DashboardLayout, CustomerLayout, navigation, billing, Supabase, APIs, migrations, database types, global styles, and stamping systems must remain unchanged. Use mock data and local component state only. If integration requires modifying existing files, stop and report the blocker.

## Checklist
- [x] Inspect current Scratch & Win prototype files and routes before implementation
- [x] Create a separate standalone enhanced builder route using only new files
- [x] Create guided multi-step campaign setup with details, schedule, prize management, customer experience, and review
- [x] Support local add/edit/remove prizes, validation, reset confirmation, step navigation, and persistent in-session state
- [x] Add responsive mobile and desktop live previews with DEMO ONLY / NOT LIVE labels
- [x] Verify only new files were created and no existing app files changed
- [x] Run available error checks

## Acceptance
The enhanced campaign builder is accessible through a separate prototype route, uses mock data/local state only, clearly states DEMO ONLY / NOT LIVE, and does not alter existing Royalty Stamp or Scratch & Win files.