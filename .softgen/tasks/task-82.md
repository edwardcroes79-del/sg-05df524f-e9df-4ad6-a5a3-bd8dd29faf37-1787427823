---
title: Quick Stamp QR Dashboard Display
status: done
priority: high
type: feature
tags: [quick-stamp, dashboard, qr]
created_by: agent
created_at: 2026-09-28T21:00:07Z
position: 82
---

## Notes
Fixed the Business Dashboard Quick Stamp QR display for businesses with an active Quick Stamp QR add-on. The existing token implementation is reused; no second token or QR system was created. The operational QR appears through the existing add-on/token gates and active loyalty program requirement. The dashboard now shows the requested Quick Stamp QR title, customer scan instruction, prominent counter-ready QR code, live `Expires in 00:59` countdown, automatic refresh after token expiration, and a manual `Refresh QR` action that generates a new 60-second token and invalidates the previous token through the existing RPC. Missing active loyalty programs show an appropriate unavailable state instead of an operational QR. Customer scanning flow, stamp RPC, redemption QR, billing, plans, RLS, and authentication were not changed. Project validation passed with no CSS, lint, TypeScript, or server errors.

## Checklist
- [x] Update the existing Business Dashboard Quick Stamp QR UI with the requested title, description, large QR, countdown, and Refresh QR action
- [x] Keep automatic 60-second refresh using the existing Quick Stamp QR token RPC
- [x] Ensure inactive add-on or missing active loyalty program shows an appropriate message instead of an operational QR
- [x] Validate manual refresh, automatic refresh, old token invalidation, current QR scanning, expired QR rejection, and project checks

## Acceptance
Active add-on businesses see a large operational Quick Stamp QR in the dashboard.
The countdown stays live in `00:59` format and refreshes automatically/manual refresh generates a new valid token.
No customer scan flow, stamp RPC, redemption QR, billing, plans, RLS, or authentication behavior is changed.