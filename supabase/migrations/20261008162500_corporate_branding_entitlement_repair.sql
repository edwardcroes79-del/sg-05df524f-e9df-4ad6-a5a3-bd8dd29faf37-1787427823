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
  'mega_plan',
  'corporate_branding',
  'boolean',
  true,
  null,
  null,
  now()
where exists (
  select 1
  from public.subscription_plans
  where id = 'mega_plan'
)
on conflict (plan_id, key) do update
set
  value_type = 'boolean',
  boolean_value = true,
  number_value = null,
  text_value = null,
  updated_at = now();