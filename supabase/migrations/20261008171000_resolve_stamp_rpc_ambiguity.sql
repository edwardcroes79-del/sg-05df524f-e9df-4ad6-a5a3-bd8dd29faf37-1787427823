CREATE OR REPLACE FUNCTION public.issue_stamp_tx(
  p_customer_id uuid,
  p_business_id uuid,
  p_loyalty_program_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.issue_stamp_core_tx(
    auth.uid(),
    p_customer_id,
    p_business_id,
    p_loyalty_program_id,
    'qr_scan'::text,
    NULL::uuid
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.issue_stamp_tx(
  p_customer_id uuid,
  p_business_id uuid,
  p_loyalty_program_id uuid,
  p_location_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_staff_id uuid;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF p_location_id IS NOT NULL AND NOT public.user_can_access_business_location(v_staff_id, p_business_id, p_location_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized for this location');
  END IF;

  IF NOT public.loyalty_program_available_at_location(p_loyalty_program_id, p_business_id, p_location_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Loyalty program is not available at this location');
  END IF;

  RETURN public.issue_stamp_core_tx(
    v_staff_id,
    p_customer_id,
    p_business_id,
    p_loyalty_program_id,
    CASE WHEN p_location_id IS NULL THEN 'staff_scan'::text ELSE 'staff_scan_location'::text END,
    p_location_id
  );
END;
$function$;

DROP FUNCTION IF EXISTS public.issue_stamp_core_tx(uuid, uuid, uuid, uuid, text);