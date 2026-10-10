---
title: Reward Redemption Authorization
status: in_progress
priority: urgent
type: bug
tags: [security, rewards, rpc, authorization]
created_by: agent
created_at: 2026-10-10T17:05:16Z
position: 172
---

## Notes
Phase 2C scope only: inspect, remediate, and verify `public.redeem_reward_tx(p_reward_code text, p_business_id uuid, p_location_id uuid)` and directly related overloads, authorization helpers, call paths, and execution grants. Confirm whether the three-argument function allows redemption without unconditional business-operator authorization when `p_location_id` is null. Preserve legitimate redemption workflows, atomicity, duplicate-redemption protections, service-role security, and unrelated authentication, registration, Turnstile, SMTP, password recovery, loyalty enrollment, pricing, subscriptions, database records, and deployment.

## Checklist
- [ ] Inspect all `redeem_reward_tx` overload definitions, security mode, owner, grants, and authorization helpers
- [ ] Inspect direct callers, API routes, frontend workflows, and intended redemption paths
- [ ] Verify reward ownership, eligibility, expiry, prior-redemption, location, and concurrency protections
- [ ] Apply the smallest safe correction if the authorization gap is confirmed
- [ ] Review and correct RPC execution grants only if necessary and compatible
- [ ] Validate unauthorized, authorized, cross-business, location, ineligible, duplicate, and overload behavior where safely testable
- [ ] Run lint/type/build validation and report actual tests

## Acceptance
Reward redemption cannot be performed by an unauthorized authenticated caller, including when `p_location_id` is null. Legitimate authorized redemption flows remain functional. All relevant overloads and execution grants are reviewed. No unrelated application behavior or production deployment is changed.