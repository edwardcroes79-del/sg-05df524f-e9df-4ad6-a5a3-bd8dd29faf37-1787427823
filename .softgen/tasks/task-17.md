---
title: Phase 4 - Staff Security & Final End-to-End Test
status: in_progress
priority: urgent
type: chore
tags: [security, audit, rls]
created_by: agent
created_at: 2026-08-20T12:23:00Z
position: 17
---

## Notes
- Perform complete Staff role verification.
- Enforce strict route guards against direct URL access for all owner-restricted pages.
- Verify RLS policies and business isolation one final time.

## Checklist
- [ ] Audit and patch `programs/new.tsx` to block Staff direct access.
- [ ] Audit and patch `programs/[id].tsx` to block Staff direct access.
- [ ] Audit and patch `staff.tsx` to block Staff direct access.
- [ ] Final check for infinite loading and onboarding bugs.
- [ ] Run project check for any final compilation errors.