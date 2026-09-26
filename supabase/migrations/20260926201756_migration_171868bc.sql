CREATE TABLE IF NOT EXISTS public.business_addon_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  addon_id text NOT NULL REFERENCES public.subscription_addons(id),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_start timestamp with time zone NOT NULL DEFAULT now(),
  current_period_end timestamp with time zone,
  payment_status text NOT NULL DEFAULT 'approved' CHECK (payment_status IN ('pending', 'approved', 'failed', 'cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_addon_subscriptions_business_status
  ON public.business_addon_subscriptions(business_id, status, payment_status);

CREATE INDEX IF NOT EXISTS idx_business_addon_subscriptions_addon_id
  ON public.business_addon_subscriptions(addon_id);

ALTER TABLE public.business_addon_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin manage business_addon_subscriptions" ON public.business_addon_subscriptions;
DROP POLICY IF EXISTS "Business read own business_addon_subscriptions" ON public.business_addon_subscriptions;

CREATE POLICY "Super admin manage business_addon_subscriptions"
ON public.business_addon_subscriptions
FOR ALL
USING (public.current_user_is_super_admin())
WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY "Business read own business_addon_subscriptions"
ON public.business_addon_subscriptions
FOR SELECT
USING (public.can_access_business(business_id));

CREATE OR REPLACE FUNCTION public.get_business_active_addon_capacity(
  p_business_id uuid,
  p_entitlement_key text DEFAULT 'max_customers'
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(sa.capacity_amount::numeric * bas.quantity::numeric), 0)
  FROM public.business_addon_subscriptions bas
  JOIN public.subscription_addons sa ON sa.id = bas.addon_id
  WHERE bas.business_id = p_business_id
    AND bas.status = 'active'
    AND bas.payment_status = 'approved'
    AND bas.starts_at <= now()
    AND (bas.ends_at IS NULL OR bas.ends_at > now())
    AND sa.addon_type = 'customer_capacity'
    AND p_entitlement_key = 'max_customers';
$function$;

CREATE OR REPLACE FUNCTION public.get_business_effective_numeric_limit(
  p_business_id uuid,
  p_key text,
  p_fallback numeric DEFAULT 0
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      WHEN p_key = 'max_customers'
        THEN COALESCE(public.get_business_numeric_limit(p_business_id, p_key, p_fallback), p_fallback)
          + public.get_business_active_addon_capacity(p_business_id, p_key)
      ELSE COALESCE(public.get_business_numeric_limit(p_business_id, p_key, p_fallback), p_fallback)
    END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_customer_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  SELECT public.get_business_effective_numeric_limit(NEW.business_id, 'max_customers', 300)
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
    RAISE EXCEPTION 'Customer member limit reached for this subscription plan. Your current customer capacity is %, including active add-ons. Existing customers remain safe, but new customer registrations are blocked until capacity is increased or inactive members are reduced.', v_limit;
  END IF;

  RETURN NEW;
END;
$function$;

DO $$
DECLARE
  v_business_id uuid;
  v_addon_small text;
  v_addon_large text;
  v_base numeric;
  v_effective_before numeric;
  v_effective_with_addons numeric;
  v_effective_after_cancel numeric;
BEGIN
  SELECT id INTO v_business_id FROM public.businesses ORDER BY created_at LIMIT 1;
  SELECT id INTO v_addon_small FROM public.subscription_addons WHERE addon_type = 'customer_capacity' AND capacity_amount > 0 ORDER BY capacity_amount ASC LIMIT 1;
  SELECT id INTO v_addon_large FROM public.subscription_addons WHERE addon_type = 'customer_capacity' AND capacity_amount > 0 ORDER BY capacity_amount DESC LIMIT 1;

  IF v_business_id IS NULL OR v_addon_small IS NULL OR v_addon_large IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.business_addon_subscriptions
  WHERE business_id = v_business_id
    AND metadata->>'regression' = 'customer_capacity_phase_3';

  SELECT public.get_business_numeric_limit(v_business_id, 'max_customers', 300) INTO v_base;
  SELECT public.get_business_effective_numeric_limit(v_business_id, 'max_customers', 300) INTO v_effective_before;

  INSERT INTO public.business_addon_subscriptions (
    business_id,
    addon_id,
    quantity,
    status,
    payment_status,
    current_period_end,
    metadata
  )
  VALUES
    (v_business_id, v_addon_small, 1, 'active', 'approved', now() + interval '30 days', '{"regression": "customer_capacity_phase_3"}'::jsonb),
    (v_business_id, v_addon_large, 2, 'active', 'approved', now() + interval '30 days', '{"regression": "customer_capacity_phase_3"}'::jsonb);

  SELECT public.get_business_effective_numeric_limit(v_business_id, 'max_customers', 300)
  INTO v_effective_with_addons;

  IF v_effective_with_addons <= v_effective_before THEN
    RAISE EXCEPTION 'Multiple add-on regression failed: effective limit did not increase';
  END IF;

  UPDATE public.business_addon_subscriptions
  SET status = 'cancelled', ends_at = now(), updated_at = now()
  WHERE business_id = v_business_id
    AND metadata->>'regression' = 'customer_capacity_phase_3'
    AND addon_id = v_addon_small;

  SELECT public.get_business_effective_numeric_limit(v_business_id, 'max_customers', 300)
  INTO v_effective_after_cancel;

  IF v_effective_after_cancel >= v_effective_with_addons THEN
    RAISE EXCEPTION 'Cancelled add-on regression failed: effective limit did not decrease';
  END IF;

  IF v_effective_after_cancel < v_base THEN
    RAISE EXCEPTION 'Cancelled add-on regression failed: effective limit dropped below base plan';
  END IF;

  DELETE FROM public.business_addon_subscriptions
  WHERE business_id = v_business_id
    AND metadata->>'regression' = 'customer_capacity_phase_3';
END $$;

SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'business_addon_subscriptions'
  ) AS business_addon_table_exists,
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_business_effective_numeric_limit'
  ) AS effective_limit_function_exists;