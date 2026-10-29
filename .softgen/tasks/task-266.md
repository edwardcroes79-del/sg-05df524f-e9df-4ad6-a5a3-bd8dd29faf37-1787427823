---
title: Missing rewards repair and admin redemption verification
status: in_progress
priority: urgent
type: bug
tags: [rewards, customer-visibility, admin-dashboard, data-repair, safety]
created_by: agent
created_at: 2026-10-29T17:16:43Z
position: 266
---

## Notes
The user authorized a narrow repair for missing eligible rewards for `sandy_r_lacle@hotmail.com` and `abigail297trimon@gmail.com`, with `sherineschwengle@gmail.com` as the authorized business admin. The repair must first verify that both customers belong to the business and loyalty program managed by the admin, confirm actual stamp counts and reward threshold, determine whether rewards already exist or are hidden, and only then create/restore missing available rewards using existing reward workflow logic. Do not create duplicates, change stamp counts, redeem rewards, modify unrelated customers, run migrations, weaken RLS, or modify Stamp Flow/Quick Stamp.

Blocked live-repair status:
- Safe environment verification found `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_URL` are not available to this sandbox runtime.
- Because live Supabase access is unavailable, the business ownership, customer membership, stamp counts, reward existence/status, customer visibility, and admin visibility cannot be verified from this session.
- No repair was attempted. Creating or restoring rewards without those live facts would risk duplicate or incorrect rewards.
- Repository evidence only: customer rewards page reads `rewards` by `customer_id`; business customer detail dialog reads `rewards` by selected customer and business; reward redemption uses existing `redeem_reward_tx`; stamp issuance is intended to create an available reward when verified total stamps modulo target is zero.
- Stamp Flow and Quick Stamp files were inspected but not modified.

Required next step:
Configure authorized Supabase environment access in the Softgen Environment settings or provide a safe authorized backend diagnostic path. Do not paste credentials in chat. After environment access is available, rerun the live read-only verification before any reward creation or restoration.

## Checklist
- [x] Inspect reward generation, reward display, admin customer/reward queries, schema types, and relevant RPC/migration evidence
- [x] Verify Supabase environment/project access safely without exposing credentials
- [ ] Verify the admin business/program relationship for `sherineschwengle@gmail.com`
- [ ] Verify each affected customer exists, belongs to the same business/program, has the actual stamp count, and meets the threshold
- [ ] Determine whether each expected reward already exists, is missing, or is hidden by status/query/RLS
- [ ] If and only if eligible reward is confirmed missing, create/restore the correct available reward without duplicates using existing workflow-compatible logic
- [ ] Verify customer visibility and business-admin visibility without redeeming rewards
- [ ] Run focused checks/static checks that do not touch Stamp Flow or Quick Stamp
- [ ] Report reward IDs, associations, statuses, duplicate prevention, tests, and safety confirmation

## Acceptance
Both eligible customers have exactly one correct available reward for the relevant program, or the task reports why a reward cannot safely be granted.
The business admin can see the rewards in the correct admin context and access the existing redemption action without any reward being redeemed.
No Stamp Flow, Quick Stamp, schema, migration, unrelated customer, stamp-count, deployment, environment, or credential changes occur.