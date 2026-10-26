BEGIN;

CREATE INDEX IF NOT EXISTS idx_stamp_transactions_business_customer_type_created
ON public.stamp_transactions (business_id, customer_id, stamp_type, created_at DESC);

CREATE FUNCTION public.award_birthday_bonus_stamp(
  p_customer_id uuid,
  p_business_id uuid,
  p_award_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_award_id uuid;
  v_award_date date;
  v_award_day_start timestamptz;
  v_award_day_end timestamptz;
  v_birthday_year integer;
  v_birth_month integer;
  v_birth_day integer;
  v_expected_award_date date;
  v_is_leap_year boolean;
  v_customer_user_id uuid;
  v_card_id uuid;
  v_card_current_stamps integer;
  v_program_id uuid;
  v_target_stamps integer;
  v_reward_title text;
  v_reward_expiration_days integer;
  v_transaction_id uuid;
  v_reward_id uuid;
  v_reward_code text;
  v_reward_earned boolean := false;
  v_reward_earned_at timestamptz;
  v_reward_expires_at timestamptz;
  v_verified_total_stamps integer;
  v_verified_current_stamps integer;
  v_card_update_count integer;
  v_existing_award public.birthday_reward_awards%ROWTYPE;
  v_error text;
  v_reward_attempt integer;
BEGIN
  IF p_customer_id IS NULL OR p_business_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_input', 'message', 'Customer and business are required');
  END IF;

  v_award_date := COALESCE(p_award_date, (now() AT TIME ZONE 'America/Aruba')::date);
  v_award_day_start := v_award_date::timestamp AT TIME ZONE 'America/Aruba';
  v_award_day_end := (v_award_date + 1)::timestamp AT TIME ZONE 'America/Aruba';
  v_birthday_year := EXTRACT(YEAR FROM v_award_date)::integer;

  SELECT c.user_id, cb.birth_month, cb.birth_day
  INTO v_customer_user_id, v_birth_month, v_birth_day
  FROM public.customers c
  JOIN public.customer_birthdays cb ON cb.customer_id = c.id
  WHERE c.id = p_customer_id;

  IF v_customer_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'customer_or_birthday_not_found', 'message', 'Customer birthday registration was not found');
  END IF;

  v_is_leap_year := (v_birthday_year % 4 = 0 AND (v_birthday_year % 100 <> 0 OR v_birthday_year % 400 = 0));

  IF v_birth_month = 2 AND v_birth_day = 29 AND NOT v_is_leap_year THEN
    v_expected_award_date := make_date(v_birthday_year, 3, 1);
  ELSE
    v_expected_award_date := make_date(v_birthday_year, v_birth_month, v_birth_day);
  END IF;

  IF v_award_date <> v_expected_award_date THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'not_birthday_processing_date',
      'message', 'Birthday award is not due on this date',
      'expected_award_date', v_expected_award_date
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses b
    JOIN public.business_birthday_reward_settings s ON s.business_id = b.id
    WHERE b.id = p_business_id
      AND b.status = 'active'
      AND public.is_business_contract_accessible(b.id)
      AND s.enabled = true
      AND s.bonus_stamps = 1
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'birthday_rewards_disabled', 'message', 'Birthday Rewards is not enabled for this business');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stamp_transactions st
    WHERE st.customer_id = p_customer_id
      AND st.business_id = p_business_id
      AND st.stamp_type = 'earned'
      AND st.created_at < v_award_day_end
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_regular_activity', 'message', 'Customer has no qualifying regular activity for this business');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stamp_transactions st
    WHERE st.customer_id = p_customer_id
      AND st.business_id = p_business_id
      AND st.stamp_type = 'earned'
      AND st.created_at >= (v_award_day_start - interval '12 months')
      AND st.created_at < v_award_day_end
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_recent_regular_activity', 'message', 'Customer has no qualifying regular activity in the preceding 12 months');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || p_customer_id::text || ':' || v_birthday_year::text, 0));

  SELECT *
  INTO v_existing_award
  FROM public.birthday_reward_awards bra
  WHERE bra.customer_id = p_customer_id
    AND bra.business_id = p_business_id
    AND bra.birthday_year = v_birthday_year
  FOR UPDATE;

  IF v_existing_award.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', v_existing_award.status = 'awarded',
      'reason', 'birthday_award_already_recorded',
      'message', 'Birthday award already recorded for this customer, business, and birthday year',
      'award_id', v_existing_award.id,
      'status', v_existing_award.status,
      'stamp_transaction_id', v_existing_award.stamp_transaction_id,
      'reward_id', v_existing_award.reward_id,
      'loyalty_card_id', v_existing_award.loyalty_card_id
    );
  END IF;

  SELECT clc.id, COALESCE(clc.current_stamps, 0), clc.loyalty_program_id, lp.stamp_target, lp.reward_title, lp.reward_expiration_days
  INTO v_card_id, v_card_current_stamps, v_program_id, v_target_stamps, v_reward_title, v_reward_expiration_days
  FROM public.customer_loyalty_cards clc
  JOIN public.loyalty_programs lp ON lp.id = clc.loyalty_program_id
  WHERE clc.customer_id = p_customer_id
    AND clc.business_id = p_business_id
    AND clc.status = 'active'
    AND lp.business_id = p_business_id
    AND lp.active = true
  ORDER BY clc.created_at ASC NULLS LAST, clc.id ASC
  LIMIT 1
  FOR UPDATE OF clc;

  IF v_card_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_active_loyalty_card', 'message', 'Customer has no active loyalty card for this business');
  END IF;

  IF v_target_stamps IS NULL OR v_target_stamps <= 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_loyalty_program_target', 'message', 'Loyalty program has an invalid stamp target');
  END IF;

  IF v_reward_expiration_days IS NOT NULL AND (v_reward_expiration_days < 1 OR v_reward_expiration_days > 365) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_reward_expiration', 'message', 'Loyalty program has an invalid reward expiration setting');
  END IF;

  INSERT INTO public.birthday_reward_awards(
    customer_id,
    business_id,
    loyalty_program_id,
    loyalty_card_id,
    birthday_year,
    birthday_date,
    status,
    attempt_count,
    reserved_at
  )
  VALUES (
    p_customer_id,
    p_business_id,
    v_program_id,
    v_card_id,
    v_birthday_year,
    v_expected_award_date,
    'reserved',
    1,
    now()
  )
  RETURNING id INTO v_award_id;

  BEGIN
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
    )
    VALUES (
      p_customer_id,
      p_business_id,
      v_program_id,
      v_card_id,
      NULL,
      'birthday_bonus',
      v_card_current_stamps + 1,
      'birthday_reward',
      NULL
    )
    RETURNING id INTO v_transaction_id;

    IF v_transaction_id IS NULL THEN
      RAISE EXCEPTION 'Birthday stamp transaction was not created';
    END IF;

    SELECT COUNT(*)::integer
    INTO v_verified_total_stamps
    FROM public.stamp_transactions
    WHERE customer_id = p_customer_id
      AND business_id = p_business_id
      AND loyalty_program_id = v_program_id
      AND loyalty_card_id = v_card_id;

    v_verified_current_stamps := v_verified_total_stamps % v_target_stamps;

    IF v_verified_current_stamps = 0 THEN
      v_reward_earned := true;
      v_reward_earned_at := now();
      v_reward_expires_at := CASE
        WHEN v_reward_expiration_days IS NULL THEN NULL
        ELSE v_reward_earned_at + make_interval(days => v_reward_expiration_days)
      END;

      FOR v_reward_attempt IN 1..5 LOOP
        BEGIN
          v_reward_code := upper(substring(md5(gen_random_uuid()::text) from 1 for 8));

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
          )
          VALUES (
            p_business_id,
            v_program_id,
            p_customer_id,
            v_reward_code,
            v_reward_title,
            'available',
            v_reward_earned_at,
            v_reward_expires_at,
            NULL
          )
          RETURNING id INTO v_reward_id;

          EXIT;
        EXCEPTION WHEN unique_violation THEN
          IF v_reward_attempt = 5 THEN
            RAISE;
          END IF;
        END;
      END LOOP;
    END IF;

    UPDATE public.customer_loyalty_cards
    SET current_stamps = v_verified_current_stamps,
        total_stamps = v_verified_total_stamps,
        rewards_earned = floor(v_verified_total_stamps::numeric / v_target_stamps)::integer,
        user_id = v_customer_user_id,
        status = 'active',
        updated_at = now()
    WHERE id = v_card_id;

    GET DIAGNOSTICS v_card_update_count = ROW_COUNT;

    IF v_card_update_count <> 1 THEN
      RAISE EXCEPTION 'Customer loyalty card update failed for card %', v_card_id;
    END IF;

    UPDATE public.birthday_reward_awards
    SET status = 'awarded',
        stamp_transaction_id = v_transaction_id,
        reward_id = v_reward_id,
        awarded_at = now(),
        last_error = NULL,
        updated_at = now()
    WHERE id = v_award_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Birthday bonus stamp awarded',
      'award_id', v_award_id,
      'stamp_transaction_id', v_transaction_id,
      'reward_id', v_reward_id,
      'reward_earned', v_reward_earned,
      'new_stamps', v_verified_current_stamps,
      'total_stamps', v_verified_total_stamps,
      'loyalty_card_id', v_card_id,
      'loyalty_program_id', v_program_id,
      'birthday_year', v_birthday_year
    );
  EXCEPTION WHEN OTHERS THEN
    v_error := SQLERRM;

    UPDATE public.birthday_reward_awards
    SET status = 'failed',
        last_error = left(v_error, 500),
        updated_at = now()
    WHERE id = v_award_id;

    RETURN jsonb_build_object(
      'success', false,
      'reason', 'birthday_award_failed',
      'message', 'Birthday bonus stamp could not be awarded',
      'award_id', v_award_id,
      'error', v_error
    );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.award_birthday_bonus_stamp(uuid, uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_birthday_bonus_stamp(uuid, uuid, date) TO service_role;

COMMENT ON FUNCTION public.award_birthday_bonus_stamp(uuid, uuid, date) IS 'Awards exactly one birthday_bonus stamp transactionally for an eligible customer and business birthday year. Intended for secure server-side processing only.';

COMMIT;