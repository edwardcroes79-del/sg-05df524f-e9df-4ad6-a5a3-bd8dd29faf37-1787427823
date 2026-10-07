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

CREATE OR REPLACE FUNCTION public.get_quick_stamp_qr_context(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_customer_id uuid;
  v_card record;
BEGIN
  SELECT
    t.token,
    t.business_id,
    t.loyalty_program_id,
    t.expires_at,
    t.used_at,
    b.business_name,
    b.logo,
    b.primary_color,
    b.status AS business_status,
    lp.name AS program_name,
    lp.stamp_target,
    lp.reward_title,
    lp.active AS program_active
  INTO v_row
  FROM public.quick_stamp_qr_tokens t
  JOIN public.businesses b ON b.id = t.business_id
  JOIN public.loyalty_programs lp ON lp.id = t.loyalty_program_id AND lp.business_id = t.business_id
  WHERE t.token = p_token;

  IF NOT FOUND
    OR v_row.used_at IS NOT NULL
    OR v_row.expires_at <= now()
    OR v_row.business_status <> 'active'
    OR v_row.program_active IS DISTINCT FROM true
    OR NOT public.is_business_contract_accessible(v_row.business_id)
    OR NOT public.business_has_active_quick_stamp_qr(v_row.business_id)
  THEN
    RETURN jsonb_build_object('success', false, 'message', 'QR Code expired. Please scan the current QR code.');
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'requires_login', true,
      'business_id', v_row.business_id,
      'business_name', v_row.business_name,
      'business_logo', v_row.logo,
      'business_primary_color', v_row.primary_color,
      'loyalty_program_id', v_row.loyalty_program_id,
      'program_name', v_row.program_name,
      'stamp_target', v_row.stamp_target,
      'reward_title', v_row.reward_title,
      'expires_at', v_row.expires_at
    );
  END IF;

  SELECT id
  INTO v_customer_id
  FROM public.customers
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'requires_login', false,
      'has_membership', false,
      'message', 'Customer profile was not found.',
      'business_id', v_row.business_id,
      'business_name', v_row.business_name,
      'business_logo', v_row.logo,
      'business_primary_color', v_row.primary_color,
      'loyalty_program_id', v_row.loyalty_program_id,
      'program_name', v_row.program_name,
      'stamp_target', v_row.stamp_target,
      'reward_title', v_row.reward_title,
      'expires_at', v_row.expires_at
    );
  END IF;

  SELECT id, current_stamps, total_stamps, rewards_earned, status
  INTO v_card
  FROM public.customer_loyalty_cards
  WHERE customer_id = v_customer_id
    AND business_id = v_row.business_id
    AND loyalty_program_id = v_row.loyalty_program_id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'requires_login', false,
    'has_membership', v_card.id IS NOT NULL,
    'business_id', v_row.business_id,
    'business_name', v_row.business_name,
    'business_logo', v_row.logo,
    'business_primary_color', v_row.primary_color,
    'loyalty_program_id', v_row.loyalty_program_id,
    'program_name', v_row.program_name,
    'stamp_target', v_row.stamp_target,
    'reward_title', v_row.reward_title,
    'expires_at', v_row.expires_at,
    'loyalty_card_id', v_card.id,
    'current_stamps', COALESCE(v_card.current_stamps, 0),
    'total_stamps', COALESCE(v_card.total_stamps, 0),
    'rewards_earned', COALESCE(v_card.rewards_earned, 0)
  );
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

GRANT EXECUTE ON FUNCTION public.get_quick_stamp_qr_context(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quick_stamp_qr_issue_stamp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_boolean_entitlement(uuid, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid, uuid, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';