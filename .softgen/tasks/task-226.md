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
Implemented real-time updates for the existing anti-fraud Security Alerts dashboard using the current Security Alerts API, staff identity resolution, alert trigger, read/unread state, and dashboard navigation badge. Database inspection showed `anti_fraud_security_alerts` and `anti_fraud_blocked_attempts` have default replica identity, but `anti_fraud_security_alerts` was not returned from `pg_publication_tables` for `supabase_realtime` in this sandbox query output. To avoid requiring an unreviewed production publication/schema change, the dashboard now attempts a business-filtered Supabase Realtime subscription and uses a lightweight polling fallback. All realtime/polling events re-fetch authoritative alert state through `/api/business/security-alerts`, so the client never decides whether an alert is legitimate or who can see it. The alerts page re-fetches on received changes, reconnect/status changes, focus, visibility return, and periodic polling. The dashboard layout unread badge uses the same authorized API summary and refreshes through realtime-when-available plus polling/focus fallback. Cooldown enforcement, alert triggering, staff identity resolution, stamping flows, reward redemption, history, and notifications were not changed.

## Checklist
- [x] Inspect current Security Alerts API, dashboard page, layout badge, Supabase client, and refresh logic
- [x] Verify whether `anti_fraud_security_alerts` is enabled for Supabase Realtime/publication
- [x] Add business-scoped realtime subscription or lightweight polling fallback for the alerts page
- [x] Update unread badge behavior in dashboard layout without duplicating entries or trusting client authorization
- [x] Re-fetch authoritative alert state on reconnect, visibility return, and received changes
- [x] Preserve staff name/email display and read/unread behavior
- [ ] Verify business isolation, unauthorized staff denial, and project checks
- [ ] Document actual database/static/browser verification and deployment status

## Acceptance
Authorized Owner/Admin users see new and updated anti-fraud security alerts and unread badge changes without manual refresh when possible, with a safe fallback and no changes to stamping, cooldown, reward, or staff identity logic.