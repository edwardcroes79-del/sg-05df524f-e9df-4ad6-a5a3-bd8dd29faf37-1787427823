CREATE OR REPLACE FUNCTION public.business_has_active_quick_stamp_qr(p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_subscription_plan text;
  v_plan_entitled boolean := false;
  v_has_addon boolean := false;
BEGIN
  SELECT b.subscription_plan
  INTO v_subscription_plan
  FROM public.businesses b
  WHERE b.id = p_business_id
    AND b.status = 'active'
    AND public.is_business_contract_accessible(b.id);

  IF v_subscription_plan IS NULL THEN
    RETURN false;
  END IF;

  v_plan_entitled := public.get_business_boolean_entitlement(p_business_id, 'quick_stamp_qr', false);

  IF COALESCE(v_plan_entitled, false) THEN
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
$function$;

GRANT EXECUTE ON FUNCTION public.business_has_active_quick_stamp_qr(uuid) TO authenticated;