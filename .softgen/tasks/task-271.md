---
title: Issue Stamp UI Improvement
status: in_progress
priority: medium
type: feature
tags: [ui, dashboard, scan]
created_by: agent
created_at: 2026-10-31T03:30:00Z
position: 271
---

## Notes
Improve the Issue Stamp interface (dashboard/scan.tsx).
- Completely remove the visible "Hardware Scanner (USB)" section (heading, input field, placeholder, supporting text).
- Improve spacing and visual hierarchy of "Select Program", "Scanning Options", "Customer Search", "Scan Customer Phone", and "Issue Stamp Button".
- Ensure responsiveness (mobile, tablet, desktop) with stacked elements on mobile.
- STRICT: UI changes only. Do not modify Supabase database schemas, RLS policies, stamp issuance logic, QR code generation, or any existing business/staff workflows.

## Checklist
- [ ] Locate and remove the Hardware Scanner (USB) UI elements.
- [ ] Polish "Select Program" dropdown spacing and hierarchy.
- [ ] Polish "Scanning Options" buttons (Camera vs Manual).
- [ ] Polish "Customer Search" field styling and clear intuition.
- [ ] Polish "Scan Customer Phone" visual separation.
- [ ] Polish "Issue Stamp" button presentation and spacing.
- [ ] Verify responsiveness.
- [ ] Run type and lint checks.

## Acceptance
- Hardware scanner section is hidden.
- UI is cleaner, modern, and aligned with Royalty Stamp design.
- No backend logic or unrelated functionality changed.