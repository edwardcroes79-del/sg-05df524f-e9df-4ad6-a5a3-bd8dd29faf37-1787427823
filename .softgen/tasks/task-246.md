---
title: Royalty Scratch & Win campaign management dashboard
status: done
priority: medium
type: feature
tags: [scratch-win, prototype, campaign-management]
created_by: agent
created_at: 2026-10-26T13:31:31Z
position: 246
---

## Notes
Build a polished, beginner-friendly, frontend-only Royalty Scratch & Win campaign management dashboard at /scratch-win/campaign-management. Must inspect existing Scratch & Win routes/components/types/data first and reuse existing template data, types, customer preview, and realistic scratch interaction where practical. Create new files only. Do not modify existing app/runtime files, route registries, navigation, layouts, shared components, existing Scratch & Win files, Supabase, database, billing, authentication, Stamp Flow, Quick Stamp, QR scanning, loyalty rewards, redemption logic, deployments, production settings, or environment configuration. Use mock data and local React state only. If integration requires editing an existing file, stop and report the blocker.

## Checklist
- [x] Inspect existing Scratch & Win routes, template data/types, integrated customer journey, and realistic scratch hook exports
- [x] Create standalone campaign management route using a new page file only
- [x] Create local campaign management data/types/utilities in new files only
- [x] Create campaign dashboard overview with summary counts, search, status filter, campaign cards/table, empty state, and DEMO ONLY / NOT LIVE labels
- [x] Create local create/edit workflow with template selection, draft fields, theme values, prizes, optional dates, validation, save and cancel
- [x] Implement working edit, preview, duplicate, archive, and delete actions with confirmations and feedback
- [x] Reuse existing customer preview/scratch hook or provide a new-file-only preview wrapper without duplicating the scratch engine
- [x] Verify no existing app/runtime files were modified and no database/backend/production operations occurred
- [x] Run available error checks

## Acceptance
The campaign management dashboard is accessible through /scratch-win/campaign-management, uses mock data/local state only, supports working local campaign actions, clearly states DEMO ONLY / NOT LIVE, and does not alter existing Royalty Stamp flows or production systems.