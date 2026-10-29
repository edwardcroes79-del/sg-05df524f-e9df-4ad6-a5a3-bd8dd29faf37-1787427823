---
title: Missing rewards repair and admin redemption verification
status: done
priority: urgent
type: bug
tags: [rewards, customer-visibility, admin-dashboard, data-repair, safety]
created_by: agent
created_at: 2026-10-29T17:16:43Z
position: 266
---

## Notes
The user authorized a narrow repair for missing eligible rewards for `sandy_r_lacle@hotmail.com` and `abigail297trimon@gmail.com`, with `sherineschwengle@gmail.com` as the authorized business admin. The repair required verifying business/program/customer eligibility, checking for existing rewards, avoiding duplicate rewards, preserving all stamp/card history, and ensuring admin redemption remains through the existing authorized workflow.

Live read-only verification completed through the existing application Supabase runtime configuration loaded from `.env.local` without printing secrets. No reward repair was needed because both rewards already exist, are available, are associated with the correct business and loyalty program, and are returned by both customer-view-shaped and admin-view-shaped reward queries.

Verified business/admin:
- Admin email: `sherineschwengle@gmail.com`
- Admin auth user found: yes
- Business: `Sugarlips&Sips`
- Business ID: `4d12d883-3f58-4b67-8f7f-7d2b01b94811`

Verified customer 1:
- Email: `sandy_r_lacle@hotmail.com`
- Customer found: yes
- Auth user found: yes
- Customer ID: `d84a33ba-c0c4-45b0-a7f4-32656550b7f1`
- Loyalty card ID: `17120519-02e3-4bd3-a114-87e315f212e9`
- Program: `Free lemonade`
- Program ID: `13429052-8af8-4a5d-8786-ede7fb9adf17`
- Program active: true
- Stamp target: 10
- Current stamps: 0
- Total stamps: 10
- Rewards earned counter: 1
- Expected rewards from total stamps: 1
- Existing available reward ID: `9293193a-882f-4f42-9f69-9eff73cc9b55`
- Reward title: `Free drink`
- Reward status: `available`
- Earned at: `2026-10-29T14:44:49.345956+00:00`
- Expires at: `2026-11-28T14:44:49.345956+00:00`
- Redeemed at: null
- Customer-view reward count: 1
- Admin-view reward count: 1
- Customer-view available unredeemed count: 1
- Admin-view available unredeemed count: 1

Verified customer 2:
- Email: `abigail297trimon@gmail.com`
- Customer found: yes
- Auth user found: yes
- Customer ID: `4f447efa-a00a-4b5b-b3b9-519705636e0d`
- Loyalty card ID: `ea718a67-ea31-4eaa-862c-51692dbd1018`
- Program: `Free lemonade`
- Program ID: `13429052-8af8-4a5d-8786-ede7fb9adf17`
- Program active: true
- Stamp target: 10
- Current stamps: 0
- Total stamps: 10
- Rewards earned counter: 1
- Expected rewards from total stamps: 1
- Existing available reward ID: `fff5bfd1-fb62-4149-9e3c-b6a38b9e90ee`
- Reward title: `Free drink`
- Reward status: `available`
- Earned at: `2026-10-29T14:45:22.222754+00:00`
- Expires at: `2026-11-28T14:45:22.222754+00:00`
- Redeemed at: null
- Customer-view reward count: 1
- Admin-view reward count: 1
- Customer-view available unredeemed count: 1
- Admin-view available unredeemed count: 1

Visibility and redemption findings:
- The customer rewards page reads `rewards` by `customer_id`; read-only verification returned one available unredeemed reward for each affected customer.
- The business admin customer detail panel reads `rewards` by selected `customer_id` and resolved `business_id`; read-only verification returned one available unredeemed reward for each affected customer under `Sugarlips&Sips`.
- The existing admin panel can display each reward and open the existing confirmation action.
- Existing redemption remains handled by `redeem_reward_tx`; no reward was redeemed during this task.

Safety confirmation:
No customer card, stamp count, stamp history, reward row, unrelated customer, database schema, migration, RLS policy, environment variable, project link, deployment, Stamp Flow, or Quick Stamp code was modified. No duplicate rewards were created and no rewards were redeemed.

## Checklist
- [x] Inspect reward generation, reward display, admin customer/reward queries, schema types, and relevant RPC/migration evidence
- [x] Verify Supabase environment/project access safely without exposing credentials
- [x] Verify the admin business/program relationship for `sherineschwengle@gmail.com`
- [x] Verify each affected customer exists, belongs to the same business/program, has the actual stamp count, and meets the threshold
- [x] Determine whether each expected reward already exists, is missing, or is hidden by status/query/RLS
- [x] If and only if eligible reward is confirmed missing, create/restore the correct available reward without duplicates using existing workflow-compatible logic
- [x] Verify customer visibility and business-admin visibility without redeeming rewards
- [x] Run focused checks/static checks that do not touch Stamp Flow or Quick Stamp
- [x] Report reward IDs, associations, statuses, duplicate prevention, tests, and safety confirmation

## Acceptance
Both eligible customers have exactly one correct available reward for the relevant program, or the task reports why a reward cannot safely be granted.
The business admin can see the rewards in the correct admin context and access the existing redemption action without any reward being redeemed.
No Stamp Flow, Quick Stamp, schema, migration, unrelated customer, stamp-count, deployment, environment, or credential changes occur.