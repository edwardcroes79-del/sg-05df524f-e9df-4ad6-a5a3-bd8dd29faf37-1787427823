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
DECLARE
  v_program_active boolean := false;
  v_subscription_plan text;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = p_loyalty_program_id
      AND lp.business_id = p_business_id
      AND lp.active = true
  )
  INTO v_program_active;

  IF NOT v_program_active THEN
    RETURN false;
  END IF;

  SELECT b.subscription_plan
  INTO v_subscription_plan
  FROM public.businesses b
  WHERE b.id = p_business_id;

  IF p_location_id IS NULL OR v_subscription_plan IS DISTINCT FROM 'mega_plan' THEN
    RETURN true;
  END IF;

  RETURN public.can_use_program_at_location(
    p_business_id,
    p_loyalty_program_id,
    p_location_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.loyalty_program_available_at_location(uuid, uuid, uuid) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.business_has_active_quick_stamp_qr(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_boolean_entitlement(uuid, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quick_stamp_qr_context(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quick_stamp_qr_issue_stamp(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';