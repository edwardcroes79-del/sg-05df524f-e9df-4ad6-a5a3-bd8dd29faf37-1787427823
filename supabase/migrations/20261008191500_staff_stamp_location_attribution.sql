CREATE OR REPLACE FUNCTION public.resolve_stamp_issue_location(
  p_staff_user_id uuid,
  p_business_id uuid,
  p_requested_location_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_business record;
  v_membership record;
  v_resolved_location_id uuid := NULL;
  v_active_location_count integer := 0;
  v_assigned_location_count integer := 0;
BEGIN
  IF p_staff_user_id IS NULL OR p_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, owner_id, subscription_plan
  INTO v_business
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT id, role, status
  INTO v_membership
  FROM public.business_users
  WHERE business_id = p_business_id
    AND user_id = p_staff_user_id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  SELECT count(*)::integer
  INTO v_active_location_count
  FROM public.business_locations
  WHERE business_id = p_business_id
    AND status <> 'inactive';

  IF p_requested_location_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.business_locations bl
      WHERE bl.id = p_requested_location_id
        AND bl.business_id = p_business_id
        AND bl.status <> 'inactive'
    ) THEN
      RAISE EXCEPTION 'Location not found or inactive';
    END IF;

    IF NOT public.user_can_access_business_location(p_staff_user_id, p_business_id, p_requested_location_id) THEN
      RAISE EXCEPTION 'Not authorized for this location';
    END IF;

    RETURN p_requested_location_id;
  END IF;

  IF v_membership.id IS NOT NULL THEN
    SELECT count(DISTINCT bul.location_id)::integer, min(bul.location_id)
    INTO v_assigned_location_count, v_resolved_location_id
    FROM public.business_user_locations bul
    JOIN public.business_locations bl ON bl.id = bul.location_id
    WHERE bul.business_user_id = v_membership.id
      AND bul.status = 'active'
      AND bl.business_id = p_business_id
      AND bl.status <> 'inactive';

    IF v_assigned_location_count = 1 THEN
      RETURN v_resolved_location_id;
    END IF;
  END IF;

  IF v_active_location_count = 1 AND (
    v_business.owner_id = p_staff_user_id
    OR COALESCE(public.is_super_admin_user(p_staff_user_id), false)
    OR COALESCE(v_membership.role, '') IN ('owner', 'admin', 'corporate_admin')
  ) THEN
    SELECT id
    INTO v_resolved_location_id
    FROM public.business_locations
    WHERE business_id = p_business_id
      AND status <> 'inactive'
    ORDER BY name ASC
    LIMIT 1;

    RETURN v_resolved_location_id;
  END IF;

  RETURN NULL;
END;
$function$;

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
DECLARE
  v_staff_id uuid;
  v_location_id uuid;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  BEGIN
    v_location_id := public.resolve_stamp_issue_location(v_staff_id, p_business_id, NULL::uuid);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
  END;

  IF v_location_id IS NOT NULL AND NOT public.loyalty_program_available_at_location(p_loyalty_program_id, p_business_id, v_location_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Loyalty program is not available at this location');
  END IF;

  RETURN public.issue_stamp_core_tx(
    v_staff_id,
    p_customer_id,
    p_business_id,
    p_loyalty_program_id,
    CASE WHEN v_location_id IS NULL THEN 'qr_scan'::text ELSE 'staff_scan_location'::text END,
    v_location_id
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
  v_location_id uuid;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  BEGIN
    v_location_id := public.resolve_stamp_issue_location(v_staff_id, p_business_id, p_location_id);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
  END;

  IF NOT public.loyalty_program_available_at_location(p_loyalty_program_id, p_business_id, v_location_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Loyalty program is not available at this location');
  END IF;

  RETURN public.issue_stamp_core_tx(
    v_staff_id,
    p_customer_id,
    p_business_id,
    p_loyalty_program_id,
    CASE WHEN v_location_id IS NULL THEN 'staff_scan'::text ELSE 'staff_scan_location'::text END,
    v_location_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_quick_stamp_qr_token(
  p_business_id uuid,
  p_loyalty_program_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_staff_id uuid;
  v_location_id uuid;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  BEGIN
    v_location_id := public.resolve_stamp_issue_location(v_staff_id, p_business_id, NULL::uuid);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
  END;

  RETURN public.generate_quick_stamp_qr_token(p_business_id, p_loyalty_program_id, v_location_id);
END;
$function$;