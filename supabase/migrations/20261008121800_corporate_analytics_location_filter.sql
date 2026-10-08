CREATE OR REPLACE FUNCTION public.issue_stamp_core_tx(
  p_staff_user_id uuid,
  p_customer_id uuid,
  p_business_id uuid,
  p_loyalty_program_id uuid,
  p_verification_method text DEFAULT 'qr_scan'::text,
  p_location_id uuid DEFAULT NULL::uuid
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

  IF p_location_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.business_locations bl
      WHERE bl.id = p_location_id
        AND bl.business_id = p_business_id
        AND bl.status <> 'inactive'
    ) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Location not found or inactive');
    END IF;

    IF NOT public.user_can_access_business_location(p_staff_user_id, p_business_id, p_location_id) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Not authorized for this location');
    END IF;
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
    verification_method,
    location_id
  ) VALUES (
    p_customer_id,
    p_business_id,
    p_loyalty_program_id,
    v_card_id,
    p_staff_user_id,
    'earned',
    COALESCE(v_current_stamps, 0) + 1,
    p_verification_method,
    p_location_id
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
    AND loyalty_card_id = v_card_id
    AND (p_location_id IS NULL OR location_id = p_location_id);

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
      expires_at,
      earned_location_id
    ) VALUES (
      p_business_id,
      p_loyalty_program_id,
      p_customer_id,
      v_reward_code,
      v_reward_title,
      'available',
      v_reward_earned_at,
      v_reward_expires_at,
      p_location_id
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
    'loyalty_card_id', v_card_id,
    'location_id', p_location_id
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
    t.location_id,
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
    'quick_stamp_qr',
    v_token_row.location_id
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

CREATE OR REPLACE FUNCTION public.get_corporate_advanced_analytics(
  p_business_id uuid,
  p_actor_user_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_location_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_business record;
  v_membership record;
  v_is_super_admin boolean := false;
  v_is_owner boolean := false;
  v_can_view_all_locations boolean := false;
  v_accessible_location_ids uuid[] := '{}';
  v_total_customers integer := 0;
  v_active_customers integer := 0;
  v_new_customers integer := 0;
  v_returning_customers integer := 0;
  v_stamps_issued integer := 0;
  v_rewards_earned integer := 0;
  v_rewards_redeemed integer := 0;
  v_redemption_rate numeric := 0;
  v_locations jsonb := '[]'::jsonb;
  v_programs jsonb := '[]'::jsonb;
  v_quick_qr jsonb := '{}'::jsonb;
  v_cross_location jsonb := '{}'::jsonb;
  v_trends jsonb := '[]'::jsonb;
  v_insights jsonb := '[]'::jsonb;
  v_location_options jsonb := '[]'::jsonb;
  v_top_location jsonb := NULL;
  v_top_program jsonb := NULL;
  v_quick_qr_stamps integer := 0;
BEGIN
  IF p_business_id IS NULL OR p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Business and authenticated user are required.';
  END IF;

  IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at < p_start_at THEN
    RAISE EXCEPTION 'A valid analytics date range is required.';
  END IF;

  SELECT id, owner_id, subscription_plan, business_name
  INTO v_business
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.plan_entitlements pe
    WHERE pe.plan_id = v_business.subscription_plan
      AND pe.key = 'advanced_analytics'
      AND pe.value_type = 'boolean'
      AND pe.boolean_value = true
  ) THEN
    RAISE EXCEPTION 'Corporate Advanced Analytics is not enabled for this business.';
  END IF;

  SELECT COALESCE(public.is_super_admin_user(p_actor_user_id), false) INTO v_is_super_admin;
  v_is_owner := v_business.owner_id = p_actor_user_id;

  SELECT id, role, status
  INTO v_membership
  FROM public.business_users
  WHERE business_id = p_business_id
    AND user_id = p_actor_user_id
    AND status = 'active'
  LIMIT 1;

  IF NOT (v_is_super_admin OR v_is_owner OR v_membership.id IS NOT NULL) THEN
    RAISE EXCEPTION 'Business access required.';
  END IF;

  v_can_view_all_locations := v_is_super_admin
    OR v_is_owner
    OR COALESCE(v_membership.role, '') IN ('owner', 'admin', 'corporate_admin');

  IF v_can_view_all_locations THEN
    SELECT COALESCE(array_agg(id ORDER BY name), '{}'::uuid[])
    INTO v_accessible_location_ids
    FROM public.business_locations
    WHERE business_id = p_business_id
      AND status <> 'inactive';
  ELSE
    SELECT COALESCE(array_agg(bul.location_id ORDER BY bl.name), '{}'::uuid[])
    INTO v_accessible_location_ids
    FROM public.business_user_locations bul
    JOIN public.business_users bu ON bu.id = bul.business_user_id
    JOIN public.business_locations bl ON bl.id = bul.location_id
    WHERE bu.business_id = p_business_id
      AND bu.user_id = p_actor_user_id
      AND bu.status = 'active'
      AND bul.status = 'active'
      AND bl.status <> 'inactive';
  END IF;

  IF p_location_id IS NOT NULL AND NOT (p_location_id = ANY(v_accessible_location_ids)) THEN
    RAISE EXCEPTION 'Location analytics access denied.';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', bl.id, 'name', bl.name, 'status', bl.status) ORDER BY bl.name), '[]'::jsonb)
  INTO v_location_options
  FROM public.business_locations bl
  WHERE bl.business_id = p_business_id
    AND bl.id = ANY(v_accessible_location_ids);

  WITH scoped_stamps AS (
    SELECT *
    FROM public.stamp_transactions st
    WHERE st.business_id = p_business_id
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
      AND (p_location_id IS NULL OR st.location_id = p_location_id)
      AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids))
  ),
  scoped_cards AS (
    SELECT DISTINCT clc.customer_id, min(clc.created_at) AS first_joined_at
    FROM public.customer_loyalty_cards clc
    WHERE clc.business_id = p_business_id
      AND clc.customer_id IS NOT NULL
      AND (
        p_location_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.stamp_transactions st
          WHERE st.business_id = p_business_id
            AND st.customer_id = clc.customer_id
            AND st.location_id = p_location_id
        )
      )
      AND (
        v_can_view_all_locations
        OR EXISTS (
          SELECT 1
          FROM public.stamp_transactions st
          WHERE st.business_id = p_business_id
            AND st.customer_id = clc.customer_id
            AND st.location_id = ANY(v_accessible_location_ids)
        )
      )
    GROUP BY clc.customer_id
  ),
  per_customer AS (
    SELECT sc.customer_id, sc.first_joined_at, count(ss.id) AS stamp_count
    FROM scoped_cards sc
    LEFT JOIN scoped_stamps ss ON ss.customer_id = sc.customer_id
    GROUP BY sc.customer_id, sc.first_joined_at
  )
  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE stamp_count > 0)::integer,
    count(*) FILTER (WHERE first_joined_at >= p_start_at AND first_joined_at <= p_end_at)::integer,
    count(*) FILTER (WHERE stamp_count >= 2)::integer,
    COALESCE(sum(stamp_count), 0)::integer
  INTO v_total_customers, v_active_customers, v_new_customers, v_returning_customers, v_stamps_issued
  FROM per_customer;

  SELECT count(*)::integer
  INTO v_rewards_earned
  FROM public.rewards r
  WHERE r.business_id = p_business_id
    AND r.earned_at >= p_start_at
    AND r.earned_at <= p_end_at
    AND (p_location_id IS NULL OR r.earned_location_id = p_location_id)
    AND (v_can_view_all_locations OR r.earned_location_id = ANY(v_accessible_location_ids));

  SELECT count(*)::integer
  INTO v_rewards_redeemed
  FROM public.rewards r
  WHERE r.business_id = p_business_id
    AND r.status = 'redeemed'
    AND r.redeemed_at >= p_start_at
    AND r.redeemed_at <= p_end_at
    AND (p_location_id IS NULL OR r.redeemed_location_id = p_location_id)
    AND (v_can_view_all_locations OR r.redeemed_location_id = ANY(v_accessible_location_ids));

  v_redemption_rate := CASE WHEN v_rewards_earned > 0 THEN round((v_rewards_redeemed::numeric / v_rewards_earned::numeric) * 100, 2) ELSE 0 END;

  WITH location_metrics AS (
    SELECT
      bl.id,
      bl.name,
      bl.status,
      count(DISTINCT st.customer_id)::integer AS customers,
      count(DISTINCT st.customer_id)::integer AS active_customers,
      count(st.id)::integer AS stamps,
      count(DISTINCT r.id)::integer AS rewards_earned,
      count(DISTINCT rr.id)::integer AS rewards_redeemed,
      CASE WHEN count(DISTINCT st.customer_id) > 0
        THEN round((count(DISTINCT st.customer_id) FILTER (WHERE customer_stamp_counts.stamp_count >= 2)::numeric / count(DISTINCT st.customer_id)::numeric) * 100, 2)
        ELSE 0
      END AS retention
    FROM public.business_locations bl
    LEFT JOIN public.stamp_transactions st ON st.business_id = bl.business_id
      AND st.location_id = bl.id
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
    LEFT JOIN (
      SELECT location_id, customer_id, count(*) AS stamp_count
      FROM public.stamp_transactions
      WHERE business_id = p_business_id
        AND created_at >= p_start_at
        AND created_at <= p_end_at
      GROUP BY location_id, customer_id
    ) customer_stamp_counts ON customer_stamp_counts.location_id = bl.id
      AND customer_stamp_counts.customer_id = st.customer_id
    LEFT JOIN public.rewards r ON r.business_id = bl.business_id
      AND r.earned_location_id = bl.id
      AND r.earned_at >= p_start_at
      AND r.earned_at <= p_end_at
    LEFT JOIN public.rewards rr ON rr.business_id = bl.business_id
      AND rr.redeemed_location_id = bl.id
      AND rr.redeemed_at >= p_start_at
      AND rr.redeemed_at <= p_end_at
      AND rr.status = 'redeemed'
    WHERE bl.business_id = p_business_id
      AND bl.id = ANY(v_accessible_location_ids)
      AND (p_location_id IS NULL OR bl.id = p_location_id)
    GROUP BY bl.id, bl.name, bl.status
  )
  SELECT
    COALESCE(jsonb_agg(to_jsonb(location_metrics) ORDER BY stamps DESC, name), '[]'::jsonb),
    COALESCE((SELECT to_jsonb(lm) FROM location_metrics lm ORDER BY lm.stamps DESC, lm.active_customers DESC, lm.name LIMIT 1), NULL)
  INTO v_locations, v_top_location
  FROM location_metrics;

  WITH program_metrics AS (
    SELECT
      lp.id,
      lp.name,
      lp.active,
      count(DISTINCT clc.customer_id)::integer AS members,
      count(st.id)::integer AS stamps,
      CASE WHEN count(DISTINCT clc.customer_id) > 0 THEN round((count(r.id)::numeric / count(DISTINCT clc.customer_id)::numeric) * 100, 2) ELSE 0 END AS completion_rate,
      count(r.id)::integer AS rewards_earned,
      count(r.id) FILTER (WHERE r.status = 'redeemed')::integer AS rewards_redeemed,
      CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.status = 'redeemed')::numeric / count(r.id)::numeric) * 100, 2) ELSE 0 END AS redemption_rate
    FROM public.loyalty_programs lp
    LEFT JOIN public.customer_loyalty_cards clc ON clc.loyalty_program_id = lp.id
    LEFT JOIN public.stamp_transactions st ON st.loyalty_program_id = lp.id
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
      AND (p_location_id IS NULL OR st.location_id = p_location_id)
      AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids))
    LEFT JOIN public.rewards r ON r.loyalty_program_id = lp.id
      AND r.earned_at >= p_start_at
      AND r.earned_at <= p_end_at
      AND (p_location_id IS NULL OR r.earned_location_id = p_location_id)
      AND (v_can_view_all_locations OR r.earned_location_id = ANY(v_accessible_location_ids))
    WHERE lp.business_id = p_business_id
    GROUP BY lp.id, lp.name, lp.active
  )
  SELECT
    COALESCE(jsonb_agg(to_jsonb(program_metrics) ORDER BY stamps DESC, name), '[]'::jsonb),
    COALESCE((SELECT to_jsonb(pm) FROM program_metrics pm ORDER BY pm.stamps DESC, pm.name LIMIT 1), NULL)
  INTO v_programs, v_top_program
  FROM program_metrics;

  SELECT count(*)::integer
  INTO v_quick_qr_stamps
  FROM public.stamp_transactions st
  WHERE st.business_id = p_business_id
    AND st.verification_method = 'quick_stamp_qr'
    AND st.created_at >= p_start_at
    AND st.created_at <= p_end_at
    AND (p_location_id IS NULL OR st.location_id = p_location_id)
    AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids));

  SELECT jsonb_build_object(
    'tokens_generated', count(*),
    'tokens_used', count(*) FILTER (WHERE used_at IS NOT NULL),
    'stamps_generated', v_quick_qr_stamps
  )
  INTO v_quick_qr
  FROM public.quick_stamp_qr_tokens qq
  WHERE qq.business_id = p_business_id
    AND qq.created_at >= p_start_at
    AND qq.created_at <= p_end_at
    AND (p_location_id IS NULL OR qq.location_id = p_location_id)
    AND (v_can_view_all_locations OR qq.location_id = ANY(v_accessible_location_ids));

  WITH location_distribution AS (
    SELECT bl.id, bl.name, count(DISTINCT st.customer_id)::integer AS customers
    FROM public.business_locations bl
    LEFT JOIN public.stamp_transactions st ON st.location_id = bl.id
      AND st.business_id = p_business_id
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
    WHERE bl.business_id = p_business_id
      AND bl.id = ANY(v_accessible_location_ids)
    GROUP BY bl.id, bl.name
  ),
  customer_locations AS (
    SELECT customer_id, count(DISTINCT location_id) FILTER (WHERE location_id IS NOT NULL) AS location_count
    FROM public.stamp_transactions st
    WHERE st.business_id = p_business_id
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
      AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids))
    GROUP BY customer_id
  )
  SELECT jsonb_build_object(
    'customers_visiting_multiple_locations', COALESCE((SELECT count(*) FROM customer_locations WHERE location_count > 1), 0),
    'distribution', COALESCE((SELECT jsonb_agg(to_jsonb(location_distribution) ORDER BY customers DESC, name) FROM location_distribution), '[]'::jsonb)
  )
  INTO v_cross_location;

  WITH day_series AS (
    SELECT generate_series(date_trunc('day', p_start_at), date_trunc('day', p_end_at), interval '1 day') AS period_start
  ),
  trend_rows AS (
    SELECT
      ds.period_start::date AS date,
      count(DISTINCT st.customer_id)::integer AS active_customers,
      count(st.id)::integer AS stamps,
      count(r.id)::integer AS rewards_earned,
      count(rr.id)::integer AS rewards_redeemed
    FROM day_series ds
    LEFT JOIN public.stamp_transactions st ON st.business_id = p_business_id
      AND st.created_at >= ds.period_start
      AND st.created_at < ds.period_start + interval '1 day'
      AND (p_location_id IS NULL OR st.location_id = p_location_id)
      AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids))
    LEFT JOIN public.rewards r ON r.business_id = p_business_id
      AND r.earned_at >= ds.period_start
      AND r.earned_at < ds.period_start + interval '1 day'
      AND (p_location_id IS NULL OR r.earned_location_id = p_location_id)
      AND (v_can_view_all_locations OR r.earned_location_id = ANY(v_accessible_location_ids))
    LEFT JOIN public.rewards rr ON rr.business_id = p_business_id
      AND rr.status = 'redeemed'
      AND rr.redeemed_at >= ds.period_start
      AND rr.redeemed_at < ds.period_start + interval '1 day'
      AND (p_location_id IS NULL OR rr.redeemed_location_id = p_location_id)
      AND (v_can_view_all_locations OR rr.redeemed_location_id = ANY(v_accessible_location_ids))
    GROUP BY ds.period_start
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(trend_rows) ORDER BY date), '[]'::jsonb)
  INTO v_trends
  FROM trend_rows;

  IF v_top_location IS NOT NULL AND COALESCE((v_top_location->>'stamps')::integer, 0) > 0 THEN
    v_insights := v_insights || jsonb_build_array(jsonb_build_object(
      'type', 'location_performance',
      'message_key', 'dashboard.analytics.insights.topLocation',
      'values', jsonb_build_object('location', v_top_location->>'name', 'count', COALESCE((v_top_location->>'stamps')::integer, 0))
    ));
  ELSE
    v_insights := v_insights || jsonb_build_array(jsonb_build_object(
      'type', 'no_location_activity',
      'message_key', 'dashboard.analytics.insights.noLocationActivity',
      'values', jsonb_build_object()
    ));
  END IF;

  IF v_top_program IS NOT NULL AND COALESCE((v_top_program->>'stamps')::integer, 0) > 0 THEN
    v_insights := v_insights || jsonb_build_array(jsonb_build_object(
      'type', 'program_performance',
      'message_key', 'dashboard.analytics.insights.topProgram',
      'values', jsonb_build_object('program', v_top_program->>'name', 'count', COALESCE((v_top_program->>'stamps')::integer, 0))
    ));
  END IF;

  IF v_quick_qr_stamps > 0 THEN
    v_insights := v_insights || jsonb_build_array(jsonb_build_object(
      'type', 'quick_qr',
      'message_key', 'dashboard.analytics.insights.quickQr',
      'values', jsonb_build_object('count', v_quick_qr_stamps)
    ));
  END IF;

  IF v_rewards_earned > 0 THEN
    v_insights := v_insights || jsonb_build_array(jsonb_build_object(
      'type', 'redemption_rate',
      'message_key', 'dashboard.analytics.insights.redemptionRate',
      'values', jsonb_build_object('value', v_redemption_rate)
    ));
  END IF;

  RETURN jsonb_build_object(
    'business_id', p_business_id,
    'business_name', v_business.business_name,
    'range', jsonb_build_object('start_at', p_start_at, 'end_at', p_end_at),
    'filters', jsonb_build_object('location_id', p_location_id),
    'access', jsonb_build_object('can_view_all_locations', v_can_view_all_locations, 'accessible_location_ids', v_accessible_location_ids),
    'overview', jsonb_build_object(
      'total_customers', v_total_customers,
      'active_customers', v_active_customers,
      'new_customers', v_new_customers,
      'returning_customers', v_returning_customers,
      'customer_growth', v_new_customers,
      'retention_rate', CASE WHEN v_active_customers > 0 THEN round((v_returning_customers::numeric / v_active_customers::numeric) * 100, 2) ELSE 0 END,
      'stamps_issued', v_stamps_issued,
      'rewards_earned', v_rewards_earned,
      'rewards_redeemed', v_rewards_redeemed,
      'redemption_rate', v_redemption_rate
    ),
    'customer_analytics', jsonb_build_object(
      'total_cards', v_total_customers,
      'active_cards', v_active_customers,
      'inactive_cards', GREATEST(v_total_customers - v_active_customers, 0),
      'customers_with_rewards', v_rewards_earned,
      'avg_stamps_per_customer', CASE WHEN v_total_customers > 0 THEN round(v_stamps_issued::numeric / v_total_customers::numeric, 2) ELSE 0 END,
      'repeat_customers', v_returning_customers,
      'one_time_customers', GREATEST(v_active_customers - v_returning_customers, 0)
    ),
    'locations', v_locations,
    'programs', v_programs,
    'quick_qr', v_quick_qr,
    'cross_location', v_cross_location,
    'trends', v_trends,
    'insights', v_insights,
    'location_options', v_location_options
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.issue_stamp_core_tx(uuid, uuid, uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quick_stamp_qr_issue_stamp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_corporate_advanced_analytics(uuid, uuid, timestamptz, timestamptz, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';