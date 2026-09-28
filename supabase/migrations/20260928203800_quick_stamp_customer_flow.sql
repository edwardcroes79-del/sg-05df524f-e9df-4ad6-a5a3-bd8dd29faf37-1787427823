ALTER TABLE public.quick_stamp_qr_tokens
ADD COLUMN IF NOT EXISTS loyalty_program_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'quick_stamp_qr_tokens_loyalty_program_id_fkey'
  ) THEN
    ALTER TABLE public.quick_stamp_qr_tokens
    ADD CONSTRAINT quick_stamp_qr_tokens_loyalty_program_id_fkey
    FOREIGN KEY (loyalty_program_id) REFERENCES public.loyalty_programs(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quick_stamp_qr_tokens_program
ON public.quick_stamp_qr_tokens(loyalty_program_id);

CREATE OR REPLACE FUNCTION public.issue_stamp_core_tx(
  p_staff_user_id uuid,
  p_customer_id uuid,
  p_business_id uuid,
  p_loyalty_program_id uuid,
  p_verification_method text DEFAULT 'qr_scan'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_card_id uuid;
  v_current_stamps integer;
  v_target_stamps integer;
  v_reward_title text;
  v_reward_expiration_days integer;
  v_reward_earned boolean := false;
  v_reward_code text;
  v_reward_earned_at timestamptz;
  v_reward_expires_at timestamptz;
  v_transaction_id uuid;
  v_customer_user_id uuid;
  v_verified_transaction_count integer;
  v_verified_current_stamps integer;
  v_verified_total_stamps integer;
  v_verified_card_count integer;
BEGIN
  IF p_staff_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF NOT public.can_access_business(p_business_id, p_staff_user_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized for this business');
  END IF;

  IF NOT public.check_and_increment_rate_limit(p_staff_user_id::text || ':' || p_business_id::text, 'issue_stamp_staff', 2000, 3600) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Staff issuing limit reached (2000/hr). Please contact support.');
  END IF;

  IF NOT public.check_and_increment_rate_limit(p_customer_id::text || ':' || p_business_id::text, 'issue_stamp_customer', 5, 60) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Too many stamps issued to this customer recently. Please wait a moment.');
  END IF;

  SELECT stamp_target, reward_title, reward_expiration_days
  INTO v_target_stamps, v_reward_title, v_reward_expiration_days
  FROM public.loyalty_programs
  WHERE id = p_loyalty_program_id
    AND business_id = p_business_id
    AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Loyalty program not found or inactive');
  END IF;

  IF v_target_stamps IS NULL OR v_target_stamps <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid loyalty program stamp target');
  END IF;

  IF v_reward_expiration_days IS NOT NULL AND (v_reward_expiration_days < 1 OR v_reward_expiration_days > 365) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid reward expiration setting');
  END IF;

  SELECT user_id
  INTO v_customer_user_id
  FROM public.customers
  WHERE id = p_customer_id;

  IF v_customer_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Customer not found');
  END IF;

  SELECT id, current_stamps
  INTO v_card_id, v_current_stamps
  FROM public.customer_loyalty_cards
  WHERE customer_id = p_customer_id
    AND loyalty_program_id = p_loyalty_program_id
    AND business_id = p_business_id
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_card_id IS NULL THEN
    INSERT INTO public.customer_loyalty_cards(
      customer_id,
      business_id,
      loyalty_program_id,
      user_id,
      current_stamps,
      total_stamps,
      rewards_earned,
      status
    ) VALUES (
      p_customer_id,
      p_business_id,
      p_loyalty_program_id,
      v_customer_user_id,
      0,
      0,
      0,
      'active'
    )
    RETURNING id INTO v_card_id;

    v_current_stamps := 0;
  END IF;

  INSERT INTO public.stamp_transactions(
    customer_id,
    business_id,
    loyalty_program_id,
    loyalty_card_id,
    staff_user_id,
    stamp_type,
    stamp_number,
    verification_method
  ) VALUES (
    p_customer_id,
    p_business_id,
    p_loyalty_program_id,
    v_card_id,
    p_staff_user_id,
    'earned',
    COALESCE(v_current_stamps, 0) + 1,
    p_verification_method
  )
  RETURNING id INTO v_transaction_id;

  IF v_transaction_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Stamp could not be saved. Please try again.');
  END IF;

  SELECT COUNT(*)
  INTO v_verified_transaction_count
  FROM public.stamp_transactions
  WHERE id = v_transaction_id
    AND customer_id = p_customer_id
    AND business_id = p_business_id
    AND loyalty_program_id = p_loyalty_program_id
    AND loyalty_card_id = v_card_id;

  IF v_verified_transaction_count <> 1 THEN
    RAISE EXCEPTION 'Stamp persistence verification failed for transaction %', v_transaction_id;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_verified_total_stamps
  FROM public.stamp_transactions
  WHERE customer_id = p_customer_id
    AND business_id = p_business_id
    AND loyalty_program_id = p_loyalty_program_id
    AND loyalty_card_id = v_card_id;

  v_verified_current_stamps := v_verified_total_stamps % v_target_stamps;

  IF v_verified_current_stamps = 0 THEN
    v_reward_earned := true;
    v_reward_code := upper(substring(md5(gen_random_uuid()::text) from 1 for 8));
    v_reward_earned_at := now();
    v_reward_expires_at := CASE
      WHEN v_reward_expiration_days IS NULL THEN NULL
      ELSE v_reward_earned_at + make_interval(days => v_reward_expiration_days)
    END;

    INSERT INTO public.rewards(
      business_id,
      loyalty_program_id,
      customer_id,
      reward_code,
      reward_title,
      status,
      earned_at,
      expires_at
    ) VALUES (
      p_business_id,
      p_loyalty_program_id,
      p_customer_id,
      v_reward_code,
      v_reward_title,
      'available',
      v_reward_earned_at,
      v_reward_expires_at
    );
  END IF;

  UPDATE public.customer_loyalty_cards
  SET current_stamps = v_verified_current_stamps,
      total_stamps = v_verified_total_stamps,
      rewards_earned = floor(v_verified_total_stamps::numeric / v_target_stamps)::integer,
      user_id = v_customer_user_id,
      updated_at = now()
  WHERE id = v_card_id;

  GET DIAGNOSTICS v_verified_card_count = ROW_COUNT;

  IF v_verified_card_count <> 1 THEN
    RAISE EXCEPTION 'Customer loyalty card update verification failed for card %', v_card_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Stamp added successfully',
    'reward_earned', v_reward_earned,
    'new_stamps', v_verified_current_stamps,
    'total_stamps', v_verified_total_stamps,
    'transaction_id', v_transaction_id,
    'loyalty_card_id', v_card_id
  );
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
BEGIN
  RETURN public.issue_stamp_core_tx(auth.uid(), p_customer_id, p_business_id, p_loyalty_program_id, 'qr_scan');
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_quick_stamp_qr_token(
  p_business_id uuid,
  p_loyalty_program_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_staff_id uuid;
  v_token uuid;
  v_expires_at timestamptz;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF p_loyalty_program_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'An active loyalty program is required for Quick Stamp QR');
  END IF;

  IF NOT public.can_access_business(p_business_id, v_staff_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized for this business');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.status = 'active'
      AND public.is_business_contract_accessible(b.id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Business is not active for Quick Stamp QR');
  END IF;

  IF NOT public.business_has_active_quick_stamp_qr(p_business_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Quick Stamp QR add-on is not active for this business');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = p_loyalty_program_id
      AND lp.business_id = p_business_id
      AND lp.active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Loyalty program not found or inactive');
  END IF;

  DELETE FROM public.quick_stamp_qr_tokens
  WHERE expires_at <= now()
     OR (business_id = p_business_id AND staff_user_id = v_staff_id);

  INSERT INTO public.quick_stamp_qr_tokens (business_id, staff_user_id, loyalty_program_id)
  VALUES (p_business_id, v_staff_id, p_loyalty_program_id)
  RETURNING token, expires_at INTO v_token, v_expires_at;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'business_id', p_business_id,
    'loyalty_program_id', p_loyalty_program_id,
    'expires_at', v_expires_at,
    'ttl_seconds', 60
  );
END;
$function$;

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
    AND used_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION 'Quick Stamp QR token consumption failed for token %', p_token;
  END IF;

  RETURN v_result || jsonb_build_object('success', true, 'message', 'Stamp added successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.issue_stamp_core_tx(uuid, uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_stamp_tx(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quick_stamp_qr_context(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quick_stamp_qr_issue_stamp(uuid) TO authenticated;