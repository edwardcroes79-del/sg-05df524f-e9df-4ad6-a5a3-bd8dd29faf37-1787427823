CREATE OR REPLACE FUNCTION public.issue_stamp_tx(p_customer_id uuid, p_business_id uuid, p_loyalty_program_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff_id uuid;
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
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF NOT public.can_access_business(p_business_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized for this business');
  END IF;

  IF NOT public.check_and_increment_rate_limit(v_staff_id::text || ':' || p_business_id::text, 'issue_stamp_staff', 2000, 3600) THEN
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
    v_staff_id,
    'earned',
    COALESCE(v_current_stamps, 0) + 1,
    'qr_scan'
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