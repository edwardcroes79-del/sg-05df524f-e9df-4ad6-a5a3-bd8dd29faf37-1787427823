CREATE OR REPLACE FUNCTION public.get_business_boolean_entitlement(
  p_business_id uuid,
  p_key text,
  p_fallback boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id text;
  v_plan_value boolean;
BEGIN
  SELECT b.subscription_plan
    INTO v_plan_id
  FROM public.businesses b
  WHERE b.id = p_business_id
    AND (
      b.owner_id = auth.uid()
      OR public.is_super_admin_user(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.business_users bu
        WHERE bu.business_id = b.id
          AND bu.user_id = auth.uid()
          AND bu.status = 'active'
      )
    );

  IF v_plan_id IS NULL THEN
    RETURN p_fallback;
  END IF;

  SELECT pe.boolean_value
    INTO v_plan_value
  FROM public.plan_entitlements pe
  WHERE pe.plan_id = v_plan_id
    AND pe.key = p_key
    AND pe.value_type = 'boolean'
  LIMIT 1;

  RETURN COALESCE(v_plan_value, p_fallback);
END;
$$;

CREATE OR REPLACE FUNCTION public.business_has_active_quick_stamp_qr(
  p_business_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_plan_entitlement boolean := false;
  v_has_addon boolean := false;
BEGIN
  IF NOT (
    public.is_super_admin_user(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = p_business_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_users bu
      WHERE bu.business_id = p_business_id
        AND bu.user_id = auth.uid()
        AND bu.status = 'active'
    )
  ) THEN
    RETURN false;
  END IF;

  v_has_plan_entitlement := public.get_business_boolean_entitlement(
    p_business_id,
    'quick_stamp_qr',
    false
  );

  IF v_has_plan_entitlement THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.business_addon_subscriptions bas
    JOIN public.subscription_addons sa ON sa.id = bas.addon_id
    WHERE bas.business_id = p_business_id
      AND bas.status = 'active'
      AND bas.payment_status = 'approved'
      AND bas.starts_at <= now()
      AND (bas.ends_at IS NULL OR bas.ends_at > now())
      AND (bas.current_period_end IS NULL OR bas.current_period_end > now())
      AND sa.status = 'active'
      AND (
        sa.slug = 'quick-stamp-qr'
        OR sa.id = 'quick_stamp_qr'
        OR sa.addon_type = 'quick_stamp_qr'
      )
  )
    INTO v_has_addon;

  RETURN COALESCE(v_has_addon, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_business_location(
  p_business_id uuid,
  p_location_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_business_id IS NULL OR p_location_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_locations bl
    WHERE bl.id = p_location_id
      AND bl.business_id = p_business_id
  ) THEN
    RETURN false;
  END IF;

  IF public.is_super_admin_user(p_user_id) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.owner_id = p_user_id
      AND b.subscription_plan = 'mega_plan'
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.business_users bu
    JOIN public.business_user_locations bul ON bul.business_user_id = bu.id
    WHERE bu.business_id = p_business_id
      AND bu.user_id = p_user_id
      AND bu.status = 'active'
      AND bul.business_id = p_business_id
      AND bul.location_id = p_location_id
      AND bul.status = 'active'
      AND bul.role IN ('corporate_admin', 'location_manager')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_boolean_entitlement(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_has_active_quick_stamp_qr(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_business_location(uuid, uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';