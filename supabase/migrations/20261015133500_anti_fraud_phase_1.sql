CREATE TABLE IF NOT EXISTS public.business_anti_fraud_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  cooldown_minutes integer NOT NULL DEFAULT 10 CHECK (cooldown_minutes IN (5, 10, 15)),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anti_fraud_blocked_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  loyalty_program_id uuid NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  loyalty_card_id uuid REFERENCES public.customer_loyalty_cards(id) ON DELETE SET NULL,
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_method text,
  cooldown_minutes integer NOT NULL,
  remaining_seconds integer NOT NULL,
  reason text NOT NULL DEFAULT 'cooldown_active',
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anti_fraud_blocked_attempts_business_attempted
  ON public.anti_fraud_blocked_attempts(business_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_anti_fraud_blocked_attempts_member_program
  ON public.anti_fraud_blocked_attempts(business_id, loyalty_program_id, customer_id, attempted_at DESC);

ALTER TABLE public.business_anti_fraud_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anti_fraud_blocked_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_anti_fraud_settings_read_access" ON public.business_anti_fraud_settings;
CREATE POLICY "business_anti_fraud_settings_read_access"
  ON public.business_anti_fraud_settings
  FOR SELECT
  USING (public.can_access_business(business_id, auth.uid()));

DROP POLICY IF EXISTS "business_anti_fraud_settings_no_direct_write" ON public.business_anti_fraud_settings;
CREATE POLICY "business_anti_fraud_settings_no_direct_write"
  ON public.business_anti_fraud_settings
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "anti_fraud_blocked_attempts_owner_admin_read" ON public.anti_fraud_blocked_attempts;
CREATE POLICY "anti_fraud_blocked_attempts_owner_admin_read"
  ON public.anti_fraud_blocked_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = anti_fraud_blocked_attempts.business_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_users bu
      WHERE bu.business_id = anti_fraud_blocked_attempts.business_id
        AND bu.user_id = auth.uid()
        AND bu.status = 'active'
        AND bu.role IN ('owner', 'admin', 'corporate_admin')
    )
    OR public.is_super_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS "anti_fraud_blocked_attempts_no_direct_write" ON public.anti_fraud_blocked_attempts;
CREATE POLICY "anti_fraud_blocked_attempts_no_direct_write"
  ON public.anti_fraud_blocked_attempts
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.can_manage_business_settings(p_business_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(public.is_super_admin_user(p_user_id), false)
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = p_business_id
        AND b.owner_id = p_user_id
        AND public.is_business_contract_accessible(b.id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_users bu
      WHERE bu.business_id = p_business_id
        AND bu.user_id = p_user_id
        AND bu.status = 'active'
        AND bu.role IN ('owner', 'admin', 'corporate_admin')
        AND public.is_business_contract_accessible(bu.business_id)
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_business_anti_fraud_settings(p_business_id uuid)
RETURNS TABLE(enabled boolean, cooldown_minutes integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(s.enabled, false) AS enabled,
    CASE WHEN s.cooldown_minutes IN (5, 10, 15) THEN s.cooldown_minutes ELSE 10 END AS cooldown_minutes
  FROM (SELECT p_business_id AS business_id) target
  LEFT JOIN public.business_anti_fraud_settings s ON s.business_id = target.business_id;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_business_anti_fraud_settings(
  p_business_id uuid,
  p_enabled boolean,
  p_cooldown_minutes integer,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(enabled boolean, cooldown_minutes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_cooldown_minutes NOT IN (5, 10, 15) THEN
    RAISE EXCEPTION 'Cooldown must be 5, 10, or 15 minutes';
  END IF;

  IF NOT public.can_manage_business_settings(p_business_id, p_user_id) THEN
    RAISE EXCEPTION 'Only a Business Owner/Admin can change anti-fraud settings';
  END IF;

  INSERT INTO public.business_anti_fraud_settings (business_id, enabled, cooldown_minutes, updated_by, updated_at)
  VALUES (p_business_id, COALESCE(p_enabled, false), p_cooldown_minutes, p_user_id, now())
  ON CONFLICT (business_id)
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    cooldown_minutes = EXCLUDED.cooldown_minutes,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  RETURN QUERY
  SELECT s.enabled, s.cooldown_minutes
  FROM public.business_anti_fraud_settings s
  WHERE s.business_id = p_business_id;
END;
$function$;

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
  v_anti_fraud_enabled boolean := false;
  v_cooldown_minutes integer := 10;
  v_recent_stamp_at timestamptz;
  v_remaining_seconds integer;
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

  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || p_loyalty_program_id::text || ':' || p_customer_id::text, 0));

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
    INSERT INTO public.customer_loyalty_cards(customer_id, business_id, loyalty_program_id, user_id, current_stamps, total_stamps, rewards_earned, status)
    VALUES (p_customer_id, p_business_id, p_loyalty_program_id, v_customer_user_id, 0, 0, 0, 'active')
    RETURNING id INTO v_card_id;
    v_current_stamps := 0;
  END IF;

  SELECT settings.enabled, settings.cooldown_minutes
  INTO v_anti_fraud_enabled, v_cooldown_minutes
  FROM public.get_business_anti_fraud_settings(p_business_id) settings;

  IF COALESCE(v_anti_fraud_enabled, false) THEN
    SELECT st.created_at
    INTO v_recent_stamp_at
    FROM public.stamp_transactions st
    WHERE st.customer_id = p_customer_id
      AND st.business_id = p_business_id
      AND st.loyalty_program_id = p_loyalty_program_id
      AND st.loyalty_card_id = v_card_id
      AND st.stamp_type = 'earned'
      AND st.created_at > now() - make_interval(mins => COALESCE(v_cooldown_minutes, 10))
    ORDER BY st.created_at DESC
    LIMIT 1;

    IF v_recent_stamp_at IS NOT NULL THEN
      v_remaining_seconds := GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (v_recent_stamp_at + make_interval(mins => COALESCE(v_cooldown_minutes, 10)) - now())))::integer
      );

      INSERT INTO public.anti_fraud_blocked_attempts(
        business_id,
        loyalty_program_id,
        customer_id,
        loyalty_card_id,
        staff_user_id,
        verification_method,
        cooldown_minutes,
        remaining_seconds,
        reason,
        attempted_at
      )
      VALUES (
        p_business_id,
        p_loyalty_program_id,
        p_customer_id,
        v_card_id,
        p_staff_user_id,
        p_verification_method,
        COALESCE(v_cooldown_minutes, 10),
        v_remaining_seconds,
        'cooldown_active',
        now()
      );

      RETURN jsonb_build_object(
        'success', false,
        'message', 'Anti-fraud cooldown active. Please wait before issuing another stamp to this member.',
        'reason', 'anti_fraud_cooldown',
        'cooldown_minutes', COALESCE(v_cooldown_minutes, 10),
        'remaining_seconds', v_remaining_seconds
      );
    END IF;
  END IF;

  INSERT INTO public.stamp_transactions(customer_id, business_id, loyalty_program_id, loyalty_card_id, staff_user_id, stamp_type, stamp_number, verification_method, location_id)
  VALUES (p_customer_id, p_business_id, p_loyalty_program_id, v_card_id, p_staff_user_id, 'earned', COALESCE(v_current_stamps, 0) + 1, p_verification_method, p_location_id)
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
    v_reward_expires_at := CASE WHEN v_reward_expiration_days IS NULL THEN NULL ELSE v_reward_earned_at + make_interval(days => v_reward_expiration_days) END;

    INSERT INTO public.rewards(business_id, loyalty_program_id, customer_id, reward_code, reward_title, status, earned_at, expires_at, earned_location_id)
    VALUES (p_business_id, p_loyalty_program_id, p_customer_id, v_reward_code, v_reward_title, 'available', v_reward_earned_at, v_reward_expires_at, p_location_id);
  END IF;

  UPDATE public.customer_loyalty_cards
  SET current_stamps = v_verified_current_stamps,
      total_stamps = v_verified_total_stamps,
      rewards_earned = floor(v_verified_total_stamps::numeric / v_target_stamps)::integer,
      user_id = v_customer_user_id,
      status = 'active',
      updated_at = now()
  WHERE id = v_card_id;

  GET DIAGNOSTICS v_verified_card_count = ROW_COUNT;

  IF v_verified_card_count <> 1 THEN
    RAISE EXCEPTION 'Customer loyalty card update verification failed for card %', v_card_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Stamp added successfully', 'reward_earned', v_reward_earned, 'new_stamps', v_verified_current_stamps, 'total_stamps', v_verified_total_stamps, 'transaction_id', v_transaction_id, 'loyalty_card_id', v_card_id, 'location_id', p_location_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.can_manage_business_settings(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_anti_fraud_settings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_business_anti_fraud_settings(uuid, boolean, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_stamp_core_tx(uuid, uuid, uuid, uuid, text, uuid) TO authenticated;