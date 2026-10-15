---
title: Realtime Security Alerts Dashboard
status: in_progress
priority: high
type: feature
tags: [anti-fraud, alerts, realtime, dashboard]
created_by: agent
created_at: 2026-10-15T15:15:14Z
position: 226
---

## Notes
Implement real-time updates for the existing anti-fraud Security Alerts dashboard. Reuse the existing Security Alerts API, staff identity resolution, alert trigger, read/unread state, and dashboard navigation badge where possible. Inspect Supabase Realtime support for `anti_fraud_security_alerts` before changing code. If realtime is unavailable or unsafe, add a lightweight polling/reconnect fallback. Preserve Owner/Admin server-side authorization and strict business isolation. Do not modify cooldown enforcement, stamp issuance, QR/NFC/camera/hardware flows, Search & Send Stamp, Quick Stamp QR, reward redemption, historical records, email/SMS notifications, or create a competing alert system.

## Checklist
- [ ] Inspect current Security Alerts API, dashboard page, layout badge, Supabase client, and refresh logic
- [ ] Verify whether `anti_fraud_security_alerts` is enabled for Supabase Realtime/publication
- [ ] Add business-scoped realtime subscription or lightweight polling fallback for the alerts page
- [ ] Update unread badge behavior in dashboard layout without duplicating entries or trusting client authorization
- [ ] Re-fetch authoritative alert state on reconnect, visibility return, and received changes
- [ ] Preserve staff name/email display and read/unread behavior
- [ ] Verify business isolation, unauthorized staff denial, and project checks
- [ ] Document actual database/static/browser verification and deployment status

## Acceptance
Authorized Owner/Admin users see new and updated anti-fraud security alerts and unread badge changes without manual refresh when possible, with a safe fallback and no changes to stamping, cooldown, reward, or staff identity logic.