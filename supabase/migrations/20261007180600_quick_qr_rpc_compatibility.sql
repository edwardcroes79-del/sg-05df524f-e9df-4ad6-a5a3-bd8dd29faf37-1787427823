CREATE OR REPLACE FUNCTION public.loyalty_program_available_at_location(
  p_loyalty_program_id uuid,
  p_business_id uuid,
  p_location_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = p_loyalty_program_id
      AND lp.business_id = p_business_id
      AND lp.active = true
  )
  AND public.can_use_program_at_location(
    p_business_id,
    p_loyalty_program_id,
    p_location_id
  );
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