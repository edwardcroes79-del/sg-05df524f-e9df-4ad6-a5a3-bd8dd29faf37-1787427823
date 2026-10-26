---
title: Royalty Scratch & Win customer experience integration
status: in_progress
priority: medium
type: feature
tags: [scratch-win, prototype, customer-experience]
created_by: agent
created_at: 2026-10-26T13:19:25Z
position: 245
---

## Notes
Integrate the existing Scratch & Win template library, campaign builder concepts, and realistic scratch-card demo into one cohesive customer-facing demo experience. Must inspect existing Scratch & Win implementation and verify actual exports before using them. Create new files only. Do not modify existing routes, navigation, layouts, shared components, global styles, Supabase, database, billing, authentication, Stamp Flow, Quick Stamp, QR scanning, balances, rewards, redemption logic, deployments, or production settings. Use mock data and local component state only. If integration requires editing an existing file, stop and report the blocker.

## Checklist
- [ ] Inspect existing Scratch & Win business dashboard, demo, template library, realistic demo, and component exports
- [ ] Create a standalone integrated customer journey route using new files only
- [ ] Reuse existing template data and realistic scratch surface hook without duplicating datasets or scratch engines
- [ ] Implement template selection, local draft customization, preview, scratch reveal, reset, and return/edit flow
- [ ] Keep DEMO ONLY / NOT LIVE labels visible across templates, drafts, scratch card, and voucher output
- [ ] Verify no existing app/runtime files were modified
- [ ] Run available error checks

## Acceptance
The integrated customer Scratch & Win demo is accessible through a standalone route, uses mock data/local state only, reuses existing frontend prototype pieces, clearly states DEMO ONLY / NOT LIVE, and does not alter existing Royalty Stamp flows or production systems.