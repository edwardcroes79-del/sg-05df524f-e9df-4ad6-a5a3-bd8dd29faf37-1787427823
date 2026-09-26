CREATE OR REPLACE FUNCTION public.get_plan_entitlement_bool(
  p_plan_id text,
  p_key text,
  p_fallback boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pe.boolean_value
      FROM public.plan_entitlements pe
      WHERE pe.plan_id = p_plan_id
        AND pe.key = p_key
        AND pe.value_type = 'boolean'
      LIMIT 1
    ),
    CASE
      WHEN p_key IN ('premium_templates', 'custom_card_branding') THEN (
        SELECT sp.includes_premium_templates
        FROM public.subscription_plans sp
        WHERE sp.id = p_plan_id
      )
      WHEN p_key = 'reward_expiration' THEN true
      ELSE p_fallback
    END,
    p_fallback
  );
$$;

CREATE OR REPLACE FUNCTION public.get_plan_entitlement_number(
  p_plan_id text,
  p_key text,
  p_fallback numeric DEFAULT 0
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pe.number_value
      FROM public.plan_entitlements pe
      WHERE pe.plan_id = p_plan_id
        AND pe.key = p_key
        AND pe.value_type = 'number'
      LIMIT 1
    ),
    CASE
      WHEN p_key = 'max_loyalty_programs' THEN (
        SELECT sp.max_loyalty_programs::numeric
        FROM public.subscription_plans sp
        WHERE sp.id = p_plan_id
      )
      WHEN p_key = 'max_customers' THEN (
        SELECT sp.max_customers::numeric
        FROM public.subscription_plans sp
        WHERE sp.id = p_plan_id
      )
      WHEN p_key = 'max_staff' THEN (
        SELECT sp.max_staff::numeric
        FROM public.subscription_plans sp
        WHERE sp.id = p_plan_id
      )
      ELSE p_fallback
    END,
    p_fallback
  );
$$;

CREATE OR REPLACE FUNCTION public.get_business_entitlement_bool(
  p_business_id uuid,
  p_key text,
  p_fallback boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_plan_entitlement_bool(b.subscription_plan, p_key, p_fallback)
  FROM public.businesses b
  WHERE b.id = p_business_id;
$$;

CREATE OR REPLACE FUNCTION public.get_business_numeric_limit(
  p_business_id uuid,
  p_key text,
  p_fallback numeric DEFAULT 0
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_plan_entitlement_number(b.subscription_plan, p_key, p_fallback)
  FROM public.businesses b
  WHERE b.id = p_business_id;
$$;

CREATE OR REPLACE FUNCTION public.enforce_loyalty_program_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.business_id IS NOT DISTINCT FROM OLD.business_id THEN
    RETURN NEW;
  END IF;

  v_limit := GREATEST(1, public.get_business_numeric_limit(NEW.business_id, 'max_loyalty_programs', 1)::integer);

  SELECT count(*)
  INTO v_count
  FROM public.loyalty_programs lp
  WHERE lp.business_id = NEW.business_id
    AND (TG_OP <> 'UPDATE' OR lp.id <> NEW.id);

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Loyalty program limit reached for this subscription plan';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_loyalty_program_feature_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reward_expiration_days IS NOT NULL
    AND NOT public.get_business_entitlement_bool(NEW.business_id, 'reward_expiration', true) THEN
    RAISE EXCEPTION 'Reward expiration is not enabled for this subscription plan';
  END IF;

  IF COALESCE(NEW.template_id, 'classic') NOT IN ('classic', 'modern', 'minimal')
    AND NOT public.get_business_entitlement_bool(NEW.business_id, 'premium_templates', false) THEN
    RAISE EXCEPTION 'Premium design templates are not enabled for this subscription plan';
  END IF;

  IF (
      NULLIF(COALESCE(NEW.card_logo_url, ''), '') IS NOT NULL
      OR NULLIF(COALESCE(NEW.card_bg_image_url, ''), '') IS NOT NULL
      OR NULLIF(COALESCE(NEW.card_banner_url, ''), '') IS NOT NULL
    )
    AND NOT public.get_business_entitlement_bool(NEW.business_id, 'custom_card_branding', public.get_business_entitlement_bool(NEW.business_id, 'premium_templates', false)) THEN
    RAISE EXCEPTION 'Custom card branding is not enabled for this subscription plan';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_loyalty_program_feature_entitlements_trigger ON public.loyalty_programs;

CREATE TRIGGER enforce_loyalty_program_feature_entitlements_trigger
BEFORE INSERT OR UPDATE ON public.loyalty_programs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_loyalty_program_feature_entitlements();

SELECT
  sp.id,
  sp.name,
  sp.price_awg,
  sp.status,
  sp.max_loyalty_programs,
  sp.max_customers,
  sp.max_staff,
  sp.includes_premium_templates,
  public.get_plan_entitlement_bool(sp.id, 'premium_templates', false) AS premium_templates_entitlement,
  public.get_plan_entitlement_bool(sp.id, 'reward_expiration', true) AS reward_expiration_entitlement,
  public.get_plan_entitlement_number(sp.id, 'max_loyalty_programs', 1) AS loyalty_program_limit_entitlement,
  public.get_plan_entitlement_number(sp.id, 'max_staff', 1) AS staff_limit_entitlement
FROM public.subscription_plans sp
ORDER BY sp.display_order, sp.price_awg, sp.name;