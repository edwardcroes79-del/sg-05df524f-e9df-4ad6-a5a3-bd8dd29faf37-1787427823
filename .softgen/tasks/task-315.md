---
title: Email restriction verification
status: todo
priority: high
type: chore
tags: [email, testing, verification]
created_by: agent
created_at: 2026-11-26T18:38:28Z
position: 315
---
## Notes
Verify that approved email flows remain active and blocked flows are silent while in-app notifications continue working. Testing should focus on evidence from code paths, database-backed notifications, and safe runtime validation without unnecessary production data changes.

## Checklist
- [ ] Verify business registration keeps its required email path
- [ ] Verify Super Admin approval confirmation keeps its email path
- [ ] Verify password reset remains under Supabase Auth and is untouched
- [ ] Verify stamp issuance and quick stamp no longer send customer emails
- [ ] Verify in-app notifications and persisted notification history remain active for setup, billing, and admin flows
- [ ] Run check_for_errors and summarize results with exact files changed

## Acceptance
The three allowed email purposes remain active, and all other automatic emails are disabled without breaking in-app notifications.
Validation evidence is captured with exact files and outcomes.