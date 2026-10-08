UPDATE public.subscription_plans
SET max_staff = 1,
    updated_at = now()
WHERE id = 'starter'
  AND max_staff IS DISTINCT FROM 1;

INSERT INTO public.plan_entitlements (plan_id, key, value_type, boolean_value, number_value, text_value, updated_at)
VALUES
  ('starter', 'max_staff', 'number', NULL, 1, NULL, now()),
  ('mega_plan', 'location_management', 'boolean', true, NULL, NULL, now()),
  ('mega_plan', 'multi_location_management', 'boolean', true, NULL, NULL, now()),
  ('mega_plan', 'staff_location_assignment', 'boolean', true, NULL, NULL, now()),
  ('mega_plan', 'location_manager', 'boolean', true, NULL, NULL, now()),
  ('mega_plan', 'location_analytics', 'boolean', true, NULL, NULL, now()),
  ('mega_plan', 'cross_location_analytics', 'boolean', true, NULL, NULL, now()),
  ('mega_plan', 'location_leaderboard', 'boolean', true, NULL, NULL, now()),
  ('mega_plan', 'corporate_branding', 'boolean', true, NULL, NULL, now()),
  ('mega_plan', 'location_specific_quick_qr', 'boolean', true, NULL, NULL, now())
ON CONFLICT (plan_id, key) DO UPDATE
SET value_type = EXCLUDED.value_type,
    boolean_value = EXCLUDED.boolean_value,
    number_value = EXCLUDED.number_value,
    text_value = EXCLUDED.text_value,
    updated_at = now();

INSERT INTO public.plan_entitlements (plan_id, key, value_type, boolean_value, number_value, text_value, updated_at)
VALUES
  ('trial', 'max_customers', 'number', NULL, 50, NULL, now()),
  ('trial', 'max_loyalty_programs', 'number', NULL, 1, NULL, now()),
  ('trial', 'max_staff', 'number', NULL, 1, NULL, now()),
  ('starter', 'max_customers', 'number', NULL, 500, NULL, now()),
  ('starter', 'max_loyalty_programs', 'number', NULL, 1, NULL, now()),
  ('business', 'max_customers', 'number', NULL, 2000, NULL, now()),
  ('business', 'max_loyalty_programs', 'number', NULL, 5, NULL, now()),
  ('business', 'max_staff', 'number', NULL, 3, NULL, now()),
  ('pro', 'max_customers', 'number', NULL, 5000, NULL, now()),
  ('pro', 'max_loyalty_programs', 'number', NULL, 10, NULL, now()),
  ('pro', 'max_staff', 'number', NULL, 10, NULL, now()),
  ('mega_plan', 'max_customers', 'number', NULL, 15000, NULL, now()),
  ('mega_plan', 'max_loyalty_programs', 'number', NULL, 25, NULL, now()),
  ('mega_plan', 'max_staff', 'number', NULL, 50, NULL, now()),
  ('mega_plan', 'max_locations', 'number', NULL, 10, NULL, now())
ON CONFLICT (plan_id, key) DO UPDATE
SET value_type = EXCLUDED.value_type,
    boolean_value = EXCLUDED.boolean_value,
    number_value = EXCLUDED.number_value,
    text_value = EXCLUDED.text_value,
    updated_at = now();

NOTIFY pgrst, 'reload schema';