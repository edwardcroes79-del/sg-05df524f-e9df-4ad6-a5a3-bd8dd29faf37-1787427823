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
Phase 2C scope only: inspected, remediated, and partially verified `public.redeem_reward_tx(p_reward_code text, p_business_id uuid, p_location_id uuid)` plus directly related overloads and QR redemption functions. Confirmed the three-argument overload did not require `is_business_operator(p_business_id, auth.uid())` when `p_location_id` was null, while the two-argument overload did. Also confirmed the old three-argument body attempted to update non-existent `rewards.location_id`; the actual schema uses `rewards.redeemed_location_id`. Updated only the three-argument overload to require authentication, unconditional business-operator authorization, optional location authorization when a location is supplied, reward ownership/status/expiry checks, `FOR UPDATE`, and update-time `status = 'available'` protection. Reviewed grants and narrowed direct execution for redemption/QR reward RPCs by revoking `PUBLIC`/`anon` and granting `authenticated`/`service_role`. Added migration `supabase/migrations/20261010170700_secure_reward_redemption_authorization.sql`. No unrelated authentication, registration, Turnstile, SMTP, password recovery, loyalty enrollment, pricing, subscription, customer data, reward balances, or deployment changes were made.

## Checklist
- [x] Inspect all `redeem_reward_tx` overload definitions, security mode, owner, grants, and authorization helpers
- [x] Inspect direct callers, API routes, frontend workflows, and intended redemption paths
- [x] Verify reward ownership, eligibility, expiry, prior-redemption, location, and concurrency protections
- [x] Apply the smallest safe correction if the authorization gap is confirmed
- [x] Review and correct RPC execution grants only if necessary and compatible
- [ ] Validate unauthorized, authorized, cross-business, location, ineligible, duplicate, and overload behavior where safely testable
- [ ] Run lint/type/build validation and report actual tests

## Acceptance
Reward redemption cannot be performed by an unauthorized authenticated caller, including when `p_location_id` is null. Legitimate authorized redemption flows remain functional. All relevant overloads and execution grants are reviewed. No unrelated application behavior or production deployment is changed.