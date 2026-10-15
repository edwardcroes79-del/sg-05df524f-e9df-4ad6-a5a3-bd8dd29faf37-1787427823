---
title: Staff Identity in Security Alerts
status: in_progress
priority: high
type: feature
tags: [anti-fraud, alerts, staff, dashboard]
created_by: agent
created_at: 2026-10-15T14:52:17Z
position: 224
---

## Notes
Improve existing anti-fraud dashboard alerts so authorized Business Owner/Admin users can clearly identify the staff member responsible for repeated cooldown-blocked stamp attempts. Use authoritative staff/account records associated with the same business. Do not trust browser-supplied names or emails. Preserve cooldown logic, alert trigger, attempt count, read/unread state, dashboard refresh behavior, Owner/Admin authorization, and strict business isolation. Do not change stamp issuance, reward redemption, customer records, unrelated features, or add email notifications. Missing staff identity must not hide or discard alerts.

## Checklist
- [ ] Inspect current security-alert API, dashboard alert UI, staff/account schema, and business-user relationships
- [ ] Return staff full name and email from server-side business-scoped joins or safe lookups
- [ ] Update dashboard alert list/detail UI to show staff name as primary label and email beneath it
- [ ] Add fallbacks for missing name, missing email, and fully unavailable staff identity
- [ ] Verify attempt counts/read state remain unchanged and alerts remain visible
- [ ] Verify business isolation prevents another business from seeing staff identity
- [ ] Run project checks and document actual SQL/UI verification limits

## Acceptance
Authorized Owner/Admin users see the responsible staff member's name and email on each anti-fraud alert when available, safe fallbacks otherwise, without changing alert grouping, cooldown enforcement, or business isolation.