CREATE INDEX IF NOT EXISTS idx_rewards_business_location_status_earned
ON public.rewards (business_id, earned_location_id, status, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_rewards_business_redeemed_location_status
ON public.rewards (business_id, redeemed_location_id, status, redeemed_at DESC);

CREATE INDEX IF NOT EXISTS idx_quick_stamp_tokens_business_location_created
ON public.quick_stamp_qr_tokens (business_id, location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_cards_business_customer_program
ON public.customer_loyalty_cards (business_id, customer_id, loyalty_program_id);

select
  'all_plan_snapshot' as section,
  jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'price_awg', price_awg,
    'max_customers', max_customers,
    'max_loyalty_programs', max_loyalty_programs,
    'max_staff', max_staff,
    'status', status
  ) order by display_order, id) as result
from public.subscription_plans;

select
  'corporate_test_data_availability' as section,
  jsonb_build_object(
    'corporate_businesses', (select count(*) from public.businesses where subscription_plan = 'mega_plan'),
    'corporate_locations', (select count(*) from public.business_locations bl join public.businesses b on b.id = bl.business_id where b.subscription_plan = 'mega_plan'),
    'corporate_staff_memberships', (select count(*) from public.business_users bu join public.businesses b on b.id = bu.business_id where b.subscription_plan = 'mega_plan'),
    'corporate_programs', (select count(*) from public.loyalty_programs lp join public.businesses b on b.id = lp.business_id where b.subscription_plan = 'mega_plan'),
    'corporate_customer_cards', (select count(*) from public.customer_loyalty_cards clc join public.businesses b on b.id = clc.business_id where b.subscription_plan = 'mega_plan'),
    'corporate_location_attributed_stamps', (select count(*) from public.stamp_transactions st join public.businesses b on b.id = st.business_id where b.subscription_plan = 'mega_plan' and st.location_id is not null),
    'corporate_location_attributed_rewards_earned', (select count(*) from public.rewards r join public.businesses b on b.id = r.business_id where b.subscription_plan = 'mega_plan' and r.earned_location_id is not null),
    'corporate_location_attributed_rewards_redeemed', (select count(*) from public.rewards r join public.businesses b on b.id = r.business_id where b.subscription_plan = 'mega_plan' and r.redeemed_location_id is not null)
  ) as result;

select
  'analytics_index_snapshot_after_fix' as section,
  jsonb_agg(jsonb_build_object(
    'tablename', tablename,
    'indexname', indexname
  ) order by tablename, indexname) as result
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_stamp_transactions_business_program_location_created',
    'idx_rewards_business_location_status_earned',
    'idx_rewards_business_redeemed_location_status',
    'idx_quick_stamp_tokens_business_location_created',
    'idx_customer_cards_business_customer_program',
    'idx_business_locations_business_status'
  );