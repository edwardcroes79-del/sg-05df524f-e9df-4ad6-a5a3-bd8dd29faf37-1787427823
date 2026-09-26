SELECT pg_get_functiondef('public.prevent_owner_subscription_entitlement_changes()'::regprocedure) AS guard_definition;

CREATE OR REPLACE FUNCTION public.enforce_customer_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit numeric;
  v_existing_members integer;
  v_customer_already_linked boolean;
BEGIN
  IF NEW.business_id IS NULL OR NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.customer_loyalty_cards clc
    WHERE clc.business_id = NEW.business_id
      AND clc.customer_id = NEW.customer_id
      AND clc.id IS DISTINCT FROM NEW.id
  )
  INTO v_customer_already_linked;

  IF v_customer_already_linked THEN
    RETURN NEW;
  END IF;

  SELECT public.get_business_numeric_limit(NEW.business_id, 'max_customers', 300)
  INTO v_limit;

  IF v_limit IS NULL OR v_limit >= 999999 THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT clc.customer_id)
  INTO v_existing_members
  FROM public.customer_loyalty_cards clc
  WHERE clc.business_id = NEW.business_id
    AND clc.customer_id IS NOT NULL;

  IF v_existing_members >= v_limit THEN
    RAISE EXCEPTION 'Customer member limit reached for this subscription plan';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_customer_member_limit_trigger ON public.customer_loyalty_cards;

CREATE TRIGGER enforce_customer_member_limit_trigger
BEFORE INSERT ON public.customer_loyalty_cards
FOR EACH ROW
EXECUTE FUNCTION public.enforce_customer_member_limit();

WITH custom_plan AS (
  INSERT INTO public.subscription_plans (
    id,
    name,
    description,
    price_awg,
    status,
    is_active,
    display_order,
    badge,
    max_loyalty_programs,
    max_customers,
    max_staff,
    includes_premium_templates,
    features,
    is_trial,
    trial_days,
    created_at,
    updated_at
  )
  VALUES (
    'phase3_professional_regression_20260926',
    'Professional Phase 3 Regression',
    'Temporary archived regression plan for database-driven entitlement verification.',
    85,
    'active',
    true,
    999,
    'Regression',
    3,
    123,
    4,
    true,
    ARRAY['Premium Templates', 'Custom Card Branding'],
    false,
    14,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_awg = EXCLUDED.price_awg,
    status = 'active',
    is_active = true,
    display_order = EXCLUDED.display_order,
    badge = EXCLUDED.badge,
    max_loyalty_programs = EXCLUDED.max_loyalty_programs,
    max_customers = EXCLUDED.max_customers,
    max_staff = EXCLUDED.max_staff,
    includes_premium_templates = EXCLUDED.includes_premium_templates,
    features = EXCLUDED.features,
    updated_at = now()
  RETURNING id
)
INSERT INTO public.plan_entitlements (plan_id, key, value_type, boolean_value, number_value, text_value, created_at, updated_at)
VALUES
  ('phase3_professional_regression_20260926', 'premium_templates', 'boolean', true, NULL, NULL, now(), now()),
  ('phase3_professional_regression_20260926', 'custom_card_branding', 'boolean', true, NULL, NULL, now(), now()),
  ('phase3_professional_regression_20260926', 'reward_expiration', 'boolean', false, NULL, NULL, now(), now()),
  ('phase3_professional_regression_20260926', 'max_loyalty_programs', 'number', NULL, 3, NULL, now(), now()),
  ('phase3_professional_regression_20260926', 'max_customers', 'number', NULL, 123, NULL, now(), now()),
  ('phase3_professional_regression_20260926', 'max_staff', 'number', NULL, 4, NULL, now(), now())
ON CONFLICT (plan_id, key) DO UPDATE SET
  value_type = EXCLUDED.value_type,
  boolean_value = EXCLUDED.boolean_value,
  number_value = EXCLUDED.number_value,
  text_value = EXCLUDED.text_value,
  updated_at = now();

UPDATE public.subscription_plans
SET status = 'archived',
    is_active = false,
    updated_at = now()
WHERE id = 'phase3_professional_regression_20260926';

SELECT
  sp.id,
  sp.name,
  sp.price_awg,
  sp.status,
  sp.is_active,
  public.get_plan_entitlement_bool(sp.id, 'premium_templates', false) AS premium_templates,
  public.get_plan_entitlement_bool(sp.id, 'custom_card_branding', false) AS custom_card_branding,
  public.get_plan_entitlement_bool(sp.id, 'reward_expiration', true) AS reward_expiration,
  public.get_plan_entitlement_number(sp.id, 'max_loyalty_programs', 0) AS max_loyalty_programs,
  public.get_plan_entitlement_number(sp.id, 'max_customers', 0) AS max_customers,
  public.get_plan_entitlement_number(sp.id, 'max_staff', 0) AS max_staff
FROM public.subscription_plans sp
WHERE sp.id IN ('trial', 'starter', 'business', 'pro', 'enterprise', 'phase3_professional_regression_20260926')
ORDER BY sp.display_order, sp.price_awg, sp.name;