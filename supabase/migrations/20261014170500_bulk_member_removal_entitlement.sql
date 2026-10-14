insert into public.plan_entitlements (
  plan_id,
  key,
  value_type,
  boolean_value,
  number_value,
  text_value,
  updated_at
)
select
  sp.id,
  'bulk_member_removal',
  'boolean',
  true,
  null,
  null,
  now()
from public.subscription_plans sp
where sp.id in ('mega_plan', 'Enterprise')
  or lower(sp.name) in ('corporate', 'enterprise')
on conflict (plan_id, key)
do update set
  value_type = excluded.value_type,
  boolean_value = excluded.boolean_value,
  number_value = null,
  text_value = null,
  updated_at = now();