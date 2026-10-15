---
title: Staff Identity Alert Bug Fix
status: in_progress
priority: urgent
type: bug
tags: [anti-fraud, alerts, staff, dashboard]
created_by: agent
created_at: 2026-10-15T15:07:03Z
position: 225
---

## Notes
Focused bug fix for anti-fraud Security Alert Details modal showing “Staff identity unavailable.” Inspect the actual data flow before changing code: authenticated staff user making the blocked attempt, cooldown rejection event, security alert record, alert API hydration, staff/account/business-membership records, and modal rendering. Make the smallest safe correction only. Do not implement realtime updates, rebuild alerts, create unnecessary migrations, change cooldown enforcement, stamping methods, rewards, customer records, transaction history, or deployment behavior. Staff identity must come from authoritative server-side account/business records for the same business, never browser-supplied values or another business’s profile. Preserve existing alert rows, attempt counts, timestamps, cooldown windows, and read/unread state.

## Checklist
- [ ] Inspect current security-alert API and modal rendering
- [ ] Inspect actual staff identity fields on blocked attempts and alert records
- [ ] Inspect staff/account/business-membership schema and relationships
- [ ] Identify whether staff ID is missing, incorrect, joined through the wrong relationship, or not displayed
- [ ] Apply the smallest safe fix to resolve same-business staff name and email
- [ ] Verify missing-name and missing-email fallbacks
- [ ] Verify existing alert details and read/unread state remain unchanged
- [ ] Run project checks and document browser/modal verification limits

## Acceptance
The Security Alert Details modal shows the correct same-business staff full name and email when resolvable, shows safe fallbacks only when genuinely unavailable, preserves alert behavior, and the report lists root cause, files changed, migrations, and actual verification results.