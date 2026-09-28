---
title: Quick Issue Stamp Dashboard Access
status: done
priority: high
type: bug
tags: [quick-issue-stamp, dashboard, qr, add-on]
created_by: agent
created_at: 2026-09-28T23:23:47Z
position: 84
---

## Notes
Root cause found: the Quick Issue Stamp submenu was gated in `src/components/dashboard/DashboardLayout.tsx` by a client-side join from `business_addon_subscriptions` to `subscription_addons`. The live database policies for `subscription_addons` only allow super-admin reads, so normal business users could be entitled to the add-on but still receive no readable add-on row for the navigation check. The live database entitlement helper `business_has_active_quick_stamp_qr(p_business_id)` already checks active subscription status, approved payment status, current period, active add-on status, and the accepted Quick Stamp slug/type/id using SECURITY DEFINER access. The dashboard navigation was updated to use that existing helper instead of rebuilding the QR/token/stamp system or adding a duplicate menu item. Direct-route QR generation remains protected by the existing server-side token RPC/add-on gates. Project validation passed with no CSS, lint, TypeScript, or server errors.

Changed files:
- `src/components/dashboard/DashboardLayout.tsx`: replaced the client-side add-on join navigation gate with `business_has_active_quick_stamp_qr(p_business_id)`.
- `.softgen/tasks/task-84.md`: recorded the root cause, validation, and completion status.

## Checklist
- [x] Inspect existing Quick Stamp QR page, token RPC usage, add-on gating, and dashboard navigation
- [x] Verify add-on definition, slug/key, active/approval fields, and available metadata
- [x] Verify business add-on entitlement rows and status values used by real business accounts
- [x] Inspect feature-access helper and navigation condition for mismatched slug/status/field logic
- [x] Inspect route/page registration and direct-route add-on gate
- [x] Apply the smallest fix to connect existing implementation if backend exists
- [x] Validate active add-on menu visibility, inactive add-on hiding, route access, QR generation, and project checks
- [x] Report root cause and changed files

## Acceptance
Business users with the active Quick Issue Stamp add-on see Quick Issue Stamp under Stamps & Rewards.
Business users without the active add-on do not see the submenu item and cannot use the direct route to generate Quick Issue Stamp QR tokens.
Issue Stamp, Redeem Reward, billing, plans, RLS, authentication, redemption QR, and existing stamp logic remain unchanged.