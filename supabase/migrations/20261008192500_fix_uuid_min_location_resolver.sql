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
    WITH assigned_locations AS (
      SELECT DISTINCT bul.location_id, bl.name
      FROM public.business_user_locations bul
      JOIN public.business_locations bl ON bl.id = bul.location_id
      WHERE bul.business_user_id = v_membership.id
        AND bul.status = 'active'
        AND bl.business_id = p_business_id
        AND bl.status <> 'inactive'
    )
    SELECT
      count(*)::integer,
      (
        SELECT al.location_id
        FROM assigned_locations al
        ORDER BY al.name ASC, al.location_id::text ASC
        LIMIT 1
      )
    INTO v_assigned_location_count, v_resolved_location_id
    FROM assigned_locations;

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