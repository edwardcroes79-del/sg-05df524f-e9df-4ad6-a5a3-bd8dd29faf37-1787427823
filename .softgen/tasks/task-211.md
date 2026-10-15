---
title: Quick Stamp QR Availability Resolver
status: in_progress
priority: urgent
type: bug
tags: [quick-stamp, qr, addons, entitlements]
created_by: agent
created_at: 2026-10-15T00:13:46Z
position: 211
---

## Notes
Bug: the Rotating Quick Issue Stamp QR component reports "Quick Stamp QR add-on is not active for this business" even though the backend shows Quick Stamp QR available/enabled for that business. Scope: inspect the actual dashboard component, API calls, add-on activation/entitlement resolver, add-on configuration, and live database records. Determine whether the runtime check uses the wrong key, wrong source, stale/default false value, plan availability vs business activation mismatch, or wrong business ID. Preserve existing subscription rules, Super Admin controls, business-level activation requirements, QR generation, 60-second rotation, loyalty program selection, stamp issuance security, and all other stamping methods. Do not hardcode business names, grant access globally, modify customer data, deploy, or change production configuration.

## Checklist
- [ ] Inspect Quick Stamp QR component and unavailable message source
- [ ] Inspect related API calls and add-on/entitlement resolver logic
- [ ] Inspect live add-on, plan, business activation, and business ID records
- [ ] Identify the exact runtime condition returning inactive
- [ ] Apply the smallest resolver/check fix without bypassing authorization
- [ ] Verify entitled and activated business can use Quick Stamp QR
- [ ] Verify non-entitled or inactive business remains blocked
- [ ] Verify selected program, 60-second rotation, and QR issuance paths remain intact
- [ ] Run validation and report root cause, files changed, and test results

## Acceptance
A business with the Quick Stamp QR add-on properly entitled and activated can open/use the rotating Quick Issue Stamp QR. Businesses without the required entitlement or activation still see the unavailable state. QR rotation and secure stamp issuance behavior remain unchanged.