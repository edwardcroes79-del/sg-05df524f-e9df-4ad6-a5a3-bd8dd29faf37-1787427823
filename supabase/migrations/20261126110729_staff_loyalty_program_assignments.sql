CREATE TABLE IF NOT EXISTS public.staff_loyalty_program_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL,
  loyalty_program_id uuid NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_loyalty_program_assignments_unique
ON public.staff_loyalty_program_assignments (business_id, staff_user_id, loyalty_program_id);

CREATE INDEX IF NOT EXISTS idx_staff_loyalty_program_assignments_staff
ON public.staff_loyalty_program_assignments (staff_user_id);

CREATE INDEX IF NOT EXISTS idx_staff_loyalty_program_assignments_program
ON public.staff_loyalty_program_assignments (loyalty_program_id);

CREATE OR REPLACE FUNCTION public.can_manage_staff_loyalty_program_assignments(
  p_business_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_business_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF COALESCE(public.is_super_admin_user(p_user_id), false) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.owner_id = p_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = p_business_id
      AND bu.user_id = p_user_id
      AND bu.status = 'active'
      AND bu.role IN ('owner', 'admin', 'corporate_admin')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.staff_can_issue_loyalty_program(
  p_staff_user_id uuid,
  p_business_id uuid,
  p_loyalty_program_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_staff_user_id IS NULL OR p_business_id IS NULL OR p_loyalty_program_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = p_loyalty_program_id
      AND lp.business_id = p_business_id
  ) THEN
    RETURN false;
  END IF;

  IF COALESCE(public.is_super_admin_user(p_staff_user_id), false) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.owner_id = p_staff_user_id
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = p_business_id
      AND bu.user_id = p_staff_user_id
      AND bu.status = 'active'
      AND bu.role IN ('owner', 'admin', 'corporate_admin')
  ) THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = p_business_id
      AND bu.user_id = p_staff_user_id
      AND bu.status = 'active'
      AND bu.role = 'staff'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.staff_loyalty_program_assignments slpa
    WHERE slpa.business_id = p_business_id
      AND slpa.staff_user_id = p_staff_user_id
      AND slpa.loyalty_program_id = p_loyalty_program_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_staff_loyalty_program_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_program_business_id uuid;
BEGIN
  IF NEW.business_id IS NULL OR NEW.staff_user_id IS NULL OR NEW.loyalty_program_id IS NULL THEN
    RAISE EXCEPTION 'Business, staff user, and loyalty program are required';
  END IF;

  SELECT lp.business_id
  INTO v_program_business_id
  FROM public.loyalty_programs lp
  WHERE lp.id = NEW.loyalty_program_id;

  IF v_program_business_id IS NULL THEN
    RAISE EXCEPTION 'Loyalty program not found';
  END IF;

  IF v_program_business_id <> NEW.business_id THEN
    RAISE EXCEPTION 'Loyalty program does not belong to this business';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = NEW.business_id
      AND bu.user_id = NEW.staff_user_id
      AND bu.status = 'active'
      AND bu.role = 'staff'
  ) THEN
    RAISE EXCEPTION 'Staff member does not have active access to this business';
  END IF;

  IF NEW.assigned_by IS NOT NULL
    AND NOT public.can_manage_staff_loyalty_program_assignments(NEW.business_id, NEW.assigned_by)
  THEN
    RAISE EXCEPTION 'Assigned by user is not authorized for this business';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_staff_loyalty_program_assignments_validate
ON public.staff_loyalty_program_assignments;

CREATE TRIGGER trg_staff_loyalty_program_assignments_validate
BEFORE INSERT OR UPDATE
ON public.staff_loyalty_program_assignments
FOR EACH ROW
EXECUTE FUNCTION public.validate_staff_loyalty_program_assignment();

ALTER TABLE public.staff_loyalty_program_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments;

CREATE POLICY "read_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments
FOR SELECT
USING (
  public.can_manage_staff_loyalty_program_assignments(business_id, auth.uid())
  OR staff_user_id = auth.uid()
);

DROP POLICY IF EXISTS "insert_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments;

CREATE POLICY "insert_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments
FOR INSERT
WITH CHECK (
  public.can_manage_staff_loyalty_program_assignments(business_id, auth.uid())
);

DROP POLICY IF EXISTS "update_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments;

CREATE POLICY "update_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments
FOR UPDATE
USING (
  public.can_manage_staff_loyalty_program_assignments(business_id, auth.uid())
)
WITH CHECK (
  public.can_manage_staff_loyalty_program_assignments(business_id, auth.uid())
);

DROP POLICY IF EXISTS "delete_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments;

CREATE POLICY "delete_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments
FOR DELETE
USING (
  public.can_manage_staff_loyalty_program_assignments(business_id, auth.uid())
);

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

  IF NOT public.staff_can_issue_loyalty_program(v_staff_id, p_business_id, p_loyalty_program_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'This staff account is not assigned to the selected loyalty card');
  END IF;

  BEGIN
    v_location_id := public.resolve_stamp_issue_location(v_staff_id, p_business_id, NULL::uuid);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
  END;

  IF v_location_id IS NOT NULL
    AND NOT public.loyalty_program_available_at_location(p_loyalty_program_id, p_business_id, v_location_id)
  THEN
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

  IF NOT public.staff_can_issue_loyalty_program(v_staff_id, p_business_id, p_loyalty_program_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'This staff account is not assigned to the selected loyalty card');
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

  IF p_loyalty_program_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'An active loyalty program is required for Quick Stamp QR');
  END IF;

  IF NOT public.staff_can_issue_loyalty_program(v_staff_id, p_business_id, p_loyalty_program_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'This staff account is not assigned to the selected loyalty card');
  END IF;

  BEGIN
    v_location_id := public.resolve_stamp_issue_location(v_staff_id, p_business_id, NULL::uuid);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
  END;

  RETURN public.generate_quick_stamp_qr_token(p_business_id, p_loyalty_program_id, v_location_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.quick_stamp_qr_issue_stamp(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token_row record;
  v_customer_id uuid;
  v_card_id uuid;
  v_result jsonb;
  v_updated_count integer;
  v_cooldown_seconds integer;
  v_recent_stamp record;
BEGIN
  SELECT
    t.token,
    t.business_id,
    t.loyalty_program_id,
    t.staff_user_id,
    t.expires_at,
    t.used_at
  INTO v_token_row
  FROM public.quick_stamp_qr_tokens t
  WHERE t.token = p_token
  FOR UPDATE;

  IF NOT FOUND
    OR v_token_row.used_at IS NOT NULL
    OR v_token_row.expires_at <= now()
  THEN
    RETURN jsonb_build_object('success', false, 'message', 'QR Code expired. Please scan the current QR code.');
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please log in to receive your stamp.');
  END IF;

  IF v_token_row.loyalty_program_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'QR Code expired. Please scan the current QR code.');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = v_token_row.business_id
      AND b.status = 'active'
      AND public.is_business_contract_accessible(b.id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'QR Code expired. Please scan the current QR code.');
  END IF;

  IF NOT public.business_has_active_quick_stamp_qr(v_token_row.business_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'QR Code expired. Please scan the current QR code.');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = v_token_row.loyalty_program_id
      AND lp.business_id = v_token_row.business_id
      AND lp.active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'QR Code expired. Please scan the current QR code.');
  END IF;

  IF NOT public.staff_can_issue_loyalty_program(
    v_token_row.staff_user_id,
    v_token_row.business_id,
    v_token_row.loyalty_program_id
  ) THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'message',
      'This staff account is no longer authorized to issue stamps for this loyalty card.'
    );
  END IF;

  SELECT id
  INTO v_customer_id
  FROM public.customers
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Customer profile was not found.');
  END IF;

  SELECT id
  INTO v_card_id
  FROM public.customer_loyalty_cards
  WHERE customer_id = v_customer_id
    AND business_id = v_token_row.business_id
    AND loyalty_program_id = v_token_row.loyalty_program_id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_card_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'You are not a member of this loyalty program yet.');
  END IF;

  v_cooldown_seconds := public.get_quick_stamp_qr_cooldown_seconds(v_token_row.business_id);

  IF v_cooldown_seconds > 0 THEN
    SELECT id, created_at
    INTO v_recent_stamp
    FROM public.stamp_transactions
    WHERE customer_id = v_customer_id
      AND business_id = v_token_row.business_id
      AND loyalty_program_id = v_token_row.loyalty_program_id
      AND loyalty_card_id = v_card_id
      AND verification_method = 'quick_stamp_qr'
      AND created_at > now() - make_interval(secs => v_cooldown_seconds)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_recent_stamp.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'A Quick Stamp was already added recently. Please wait before scanning again.',
        'cooldown_seconds', v_cooldown_seconds,
        'last_stamp_at', v_recent_stamp.created_at
      );
    END IF;
  END IF;

  v_result := public.issue_stamp_core_tx(
    v_token_row.staff_user_id,
    v_customer_id,
    v_token_row.business_id,
    v_token_row.loyalty_program_id,
    'quick_stamp_qr'
  );

  IF NOT COALESCE((v_result->>'success')::boolean, false) THEN
    RETURN v_result;
  END IF;

  UPDATE public.quick_stamp_qr_tokens
  SET used_at = now()
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION 'Quick Stamp QR token consumption failed for token %', p_token;
  END IF;

  RETURN v_result || jsonb_build_object('success', true, 'message', 'Stamp added successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.issue_stamp_tx(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_stamp_tx(uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quick_stamp_qr_issue_stamp(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';