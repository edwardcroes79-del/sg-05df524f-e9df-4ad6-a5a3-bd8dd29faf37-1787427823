INSERT INTO public.subscription_addons (
  id,
  name,
  slug,
  description,
  addon_type,
  capacity_amount,
  monthly_price_awg,
  status,
  display_order,
  metadata,
  updated_at
) VALUES (
  'quick_stamp_qr',
  '⚡ Quick Stamp QR',
  'quick-stamp-qr',
  'Optional add-on that unlocks a secure 60-second rotating QR code for quick stamp issuance.',
  'quick_stamp_qr',
  1,
  0,
  'active',
  20,
  jsonb_build_object(
    'entitlement_key', 'quick_stamp_qr',
    'token_ttl_seconds', 60,
    'customer_cooldown_seconds', 300
  ),
  now()
)
ON CONFLICT (id) DO UPDATE
SET metadata = COALESCE(public.subscription_addons.metadata, '{}'::jsonb)
  || jsonb_build_object(
    'entitlement_key', 'quick_stamp_qr',
    'token_ttl_seconds', 60,
    'customer_cooldown_seconds',
    COALESCE((public.subscription_addons.metadata->>'customer_cooldown_seconds')::integer, 300)
  ),
  updated_at = now();

CREATE OR REPLACE FUNCTION public.get_quick_stamp_qr_cooldown_seconds(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cooldown_seconds integer;
BEGIN
  SELECT NULLIF(sa.metadata->>'customer_cooldown_seconds', '')::integer
  INTO v_cooldown_seconds
  FROM public.business_addon_subscriptions bas
  JOIN public.subscription_addons sa ON sa.id = bas.addon_id
  WHERE bas.business_id = p_business_id
    AND bas.status = 'active'
    AND bas.payment_status = 'approved'
    AND (bas.current_period_end IS NULL OR bas.current_period_end > now())
    AND sa.status = 'active'
    AND (
      sa.id = 'quick_stamp_qr'
      OR sa.slug = 'quick-stamp-qr'
      OR sa.addon_type = 'quick_stamp_qr'
    )
  ORDER BY bas.created_at DESC
  LIMIT 1;

  RETURN LEAST(GREATEST(COALESCE(v_cooldown_seconds, 300), 0), 86400);
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN 300;
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

GRANT EXECUTE ON FUNCTION public.get_quick_stamp_qr_cooldown_seconds(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quick_stamp_qr_issue_stamp(uuid) TO authenticated;