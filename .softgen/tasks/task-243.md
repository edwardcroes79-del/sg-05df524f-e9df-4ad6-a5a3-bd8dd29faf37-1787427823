---
title: Royalty Scratch & Win template library
status: done
priority: medium
type: feature
tags: [scratch-win, prototype, templates]
created_by: agent
created_at: 2026-10-26T13:02:22Z
position: 243
---

## Notes
Build a standalone Royalty Scratch & Win campaign template library using new files only. Must inspect the current implementation first. Do not modify existing routes, navigation, shared components, global styles, configuration, authentication, billing, Supabase settings, stamping, Quick Stamp, QR scanning, rewards, redemption, or any existing file. Use mock data and local component state only. If integration into an existing builder requires editing an existing file, stop and report the blocker.

## Checklist
- [x] Inspect current Scratch & Win prototype routes and enhanced builder implementation
- [x] Create standalone template library route using a new page file only
- [x] Create template mock data with eight approved templates and illustrative prize/duration/expiration fields
- [x] Create responsive template gallery with category labels and visual previews
- [x] Create template detail preview panel with DEMO ONLY / NOT LIVE disclosures
- [x] Create editable local draft state after selecting a template, including switching templates and Start from Scratch
- [x] Add discard/reset draft action with confirmation and no persistence claims
- [x] Verify only new files were created and no existing app files changed
- [x] Run available error checks

## Acceptance
The template library is accessible through a standalone route, uses mock data/local state only, clearly states DEMO ONLY / NOT LIVE, and does not alter existing Royalty Stamp or Scratch & Win files.