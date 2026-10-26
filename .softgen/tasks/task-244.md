---
title: Royalty Scratch & Win realistic scratch card
status: in_progress
priority: medium
type: feature
tags: [scratch-win, prototype, canvas]
created_by: agent
created_at: 2026-10-26T13:11:05Z
position: 244
---

## Notes
Improve the Royalty Scratch & Win customer scratch-card realism as an isolated prototype enhancement. Existing files must remain unchanged: do not edit, overwrite, rename, or delete existing Scratch & Win files, routes, shared components, global styles, navigation, Supabase, billing, authentication, Stamp Flow, Quick Stamp, QR scanning, balances, rewards, or redemption logic. Inspect current implementation first. Use new files only, mock data, local component state, and no unnecessary dependencies. If integration requires editing an existing file, stop and report the blocker.

## Checklist
- [ ] Inspect current Scratch & Win customer card implementation and routes
- [ ] Create a new isolated realistic scratch card component using canvas pointer interaction
- [ ] Create a new standalone route to demo the realistic scratch-off experience without modifying existing routes
- [ ] Add mock prize/demo data or local constants in new files only
- [ ] Support mouse, touch, pointer cancel/leave handling, high-DPI scaling, and scratch-progress threshold reveal
- [ ] Provide accessible Reveal Result alternative with the same completion behavior
- [ ] Verify only new files were created and no existing app files changed
- [ ] Run available error checks

## Acceptance
The realistic scratch-off demo is accessible through a standalone new route, uses mock data/local state only, clearly states DEMO ONLY / NOT LIVE, and does not alter existing Royalty Stamp or Scratch & Win files.