CREATE OR REPLACE FUNCTION public.loyalty_program_available_at_location(
  p_loyalty_program_id uuid,
  p_business_id uuid,
  p_location_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = p_loyalty_program_id
      AND lp.business_id = p_business_id
      AND lp.active = true
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.loyalty_program_available_at_location(uuid, uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.business_has_active_quick_stamp_qr(p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_subscription_plan text;
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

  IF v_subscription_plan = 'mega_plan' THEN
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

GRANT EXECUTE ON FUNCTION public.business_has_active_quick_stamp_qr(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_boolean_entitlement(uuid, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quick_stamp_qr_context(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quick_stamp_qr_issue_stamp(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';