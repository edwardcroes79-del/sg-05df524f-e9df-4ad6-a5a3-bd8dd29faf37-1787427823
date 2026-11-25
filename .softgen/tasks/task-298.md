---
title: Staff-safe setup assistance loading
status: in_progress
priority: urgent
type: bug
tags: [dashboard, roles, setup-assistance]
created_by: agent
created_at: 2026-11-25T14:16:14Z
position: 298
---
## Notes
Fix the Staff dashboard runtime error caused by Setup Assistance business lookup. Preserve existing Business Admin and Super Admin behavior. Use the existing authenticated role and permission model, do not broaden access, and avoid changes to login, registration, or unrelated dashboard features.

## Checklist
- [ ] Inspect the dashboard role-resolution logic and Setup Assistance loading path
- [ ] Identify how Super Admin, Business Admin, and Staff are distinguished in the current codebase
- [ ] Add the smallest role-aware guard so Staff does not call Setup Assistance business-management logic
- [ ] Preserve Business Admin Setup Assistance loading for their own business
- [ ] Preserve Super Admin Setup Assistance management behavior
- [ ] Ensure unauthorized or unavailable Setup Assistance data cannot crash dashboard rendering
- [ ] Validate with check_for_errors

## Acceptance
Staff can sign in to the dashboard without triggering the managed-business runtime error.
Business Admin and Super Admin Setup Assistance flows continue to work as before.