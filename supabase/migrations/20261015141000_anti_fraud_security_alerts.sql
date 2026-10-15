CREATE TABLE IF NOT EXISTS public.anti_fraud_security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  loyalty_program_id uuid NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  loyalty_card_id uuid REFERENCES public.customer_loyalty_cards(id) ON DELETE SET NULL,
  staff_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_group_key text NOT NULL,
  cooldown_started_at timestamptz NOT NULL,
  cooldown_expires_at timestamptz NOT NULL,
  first_attempt_at timestamptz NOT NULL,
  latest_attempt_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 2 CHECK (attempt_count >= 2),
  reason text NOT NULL DEFAULT 'repeated_stamp_attempts_during_cooldown',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed')),
  read_at timestamptz,
  read_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anti_fraud_security_alerts_business_latest
  ON public.anti_fraud_security_alerts(business_id, latest_attempt_at DESC);

CREATE INDEX IF NOT EXISTS idx_anti_fraud_security_alerts_unread
  ON public.anti_fraud_security_alerts(business_id, read_at, latest_attempt_at DESC);

CREATE INDEX IF NOT EXISTS idx_anti_fraud_security_alerts_group
  ON public.anti_fraud_security_alerts(
    business_id,
    loyalty_program_id,
    customer_id,
    staff_group_key,
    cooldown_started_at,
    cooldown_expires_at
  );

ALTER TABLE public.anti_fraud_security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anti_fraud_security_alerts_owner_admin_read" ON public.anti_fraud_security_alerts;
CREATE POLICY "anti_fraud_security_alerts_owner_admin_read"
  ON public.anti_fraud_security_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = anti_fraud_security_alerts.business_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_users bu
      WHERE bu.business_id = anti_fraud_security_alerts.business_id
        AND bu.user_id = auth.uid()
        AND bu.status = 'active'
        AND bu.role IN ('owner', 'admin', 'corporate_admin')
    )
    OR public.is_super_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS "anti_fraud_security_alerts_no_direct_write" ON public.anti_fraud_security_alerts;
CREATE POLICY "anti_fraud_security_alerts_no_direct_write"
  ON public.anti_fraud_security_alerts
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.upsert_anti_fraud_security_alert_from_blocked_attempt(p_attempt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_attempt public.anti_fraud_blocked_attempts%ROWTYPE;
  v_staff_key text;
  v_cooldown_started_at timestamptz;
  v_cooldown_expires_at timestamptz;
  v_first_attempt_at timestamptz;
  v_latest_attempt_at timestamptz;
  v_attempt_count integer;
  v_existing_alert_id uuid;
BEGIN
  SELECT *
  INTO v_attempt
  FROM public.anti_fraud_blocked_attempts
  WHERE id = p_attempt_id;

  IF v_attempt.id IS NULL OR v_attempt.reason IS DISTINCT FROM 'cooldown_active' THEN
    RETURN;
  END IF;

  v_staff_key := COALESCE(v_attempt.staff_user_id::text, 'unknown-staff');
  v_cooldown_expires_at := v_attempt.attempted_at + make_interval(secs => GREATEST(COALESCE(v_attempt.remaining_seconds, 0), 0));
  v_cooldown_started_at := v_cooldown_expires_at - make_interval(mins => COALESCE(v_attempt.cooldown_minutes, 10));

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      v_attempt.business_id::text || ':' ||
      v_attempt.loyalty_program_id::text || ':' ||
      v_attempt.customer_id::text || ':' ||
      v_staff_key,
      29
    )
  );

  SELECT
    COUNT(*)::integer,
    MIN(afa.attempted_at),
    MAX(afa.attempted_at)
  INTO v_attempt_count, v_first_attempt_at, v_latest_attempt_at
  FROM public.anti_fraud_blocked_attempts afa
  WHERE afa.business_id = v_attempt.business_id
    AND afa.loyalty_program_id = v_attempt.loyalty_program_id
    AND afa.customer_id = v_attempt.customer_id
    AND COALESCE(afa.staff_user_id::text, 'unknown-staff') = v_staff_key
    AND afa.reason = 'cooldown_active'
    AND afa.attempted_at >= v_cooldown_started_at
    AND afa.attempted_at <= v_cooldown_expires_at;

  IF COALESCE(v_attempt_count, 0) < 2 THEN
    RETURN;
  END IF;

  SELECT alert.id
  INTO v_existing_alert_id
  FROM public.anti_fraud_security_alerts alert
  WHERE alert.business_id = v_attempt.business_id
    AND alert.loyalty_program_id = v_attempt.loyalty_program_id
    AND alert.customer_id = v_attempt.customer_id
    AND alert.staff_group_key = v_staff_key
    AND tstzrange(alert.cooldown_started_at, alert.cooldown_expires_at, '[]') &&
        tstzrange(v_cooldown_started_at, v_cooldown_expires_at, '[]')
  ORDER BY alert.created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_existing_alert_id IS NULL THEN
    INSERT INTO public.anti_fraud_security_alerts (
      business_id,
      loyalty_program_id,
      customer_id,
      loyalty_card_id,
      staff_user_id,
      staff_group_key,
      cooldown_started_at,
      cooldown_expires_at,
      first_attempt_at,
      latest_attempt_at,
      attempt_count,
      reason,
      status,
      created_at,
      updated_at
    )
    VALUES (
      v_attempt.business_id,
      v_attempt.loyalty_program_id,
      v_attempt.customer_id,
      v_attempt.loyalty_card_id,
      v_attempt.staff_user_id,
      v_staff_key,
      v_cooldown_started_at,
      v_cooldown_expires_at,
      v_first_attempt_at,
      v_latest_attempt_at,
      v_attempt_count,
      'repeated_stamp_attempts_during_cooldown',
      'open',
      now(),
      now()
    );
  ELSE
    UPDATE public.anti_fraud_security_alerts
    SET
      loyalty_card_id = COALESCE(v_attempt.loyalty_card_id, loyalty_card_id),
      staff_user_id = COALESCE(v_attempt.staff_user_id, staff_user_id),
      cooldown_started_at = LEAST(cooldown_started_at, v_cooldown_started_at),
      cooldown_expires_at = GREATEST(cooldown_expires_at, v_cooldown_expires_at),
      first_attempt_at = LEAST(first_attempt_at, v_first_attempt_at),
      latest_attempt_at = GREATEST(latest_attempt_at, v_latest_attempt_at),
      attempt_count = GREATEST(v_attempt_count, attempt_count),
      status = CASE WHEN read_at IS NULL THEN status ELSE 'open' END,
      read_at = NULL,
      read_by = NULL,
      updated_at = now()
    WHERE id = v_existing_alert_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_anti_fraud_blocked_attempt_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.upsert_anti_fraud_security_alert_from_blocked_attempt(NEW.id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS anti_fraud_blocked_attempt_alert_trigger ON public.anti_fraud_blocked_attempts;
CREATE TRIGGER anti_fraud_blocked_attempt_alert_trigger
  AFTER INSERT ON public.anti_fraud_blocked_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.process_anti_fraud_blocked_attempt_alert();

CREATE OR REPLACE FUNCTION public.mark_anti_fraud_security_alert_read(
  p_alert_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(id uuid, read_at timestamptz, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_business_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT alert.business_id
  INTO v_business_id
  FROM public.anti_fraud_security_alerts alert
  WHERE alert.id = p_alert_id;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Security alert not found';
  END IF;

  IF NOT public.can_manage_business_settings(v_business_id, p_user_id) THEN
    RAISE EXCEPTION 'Only a Business Owner/Admin can manage security alerts';
  END IF;

  UPDATE public.anti_fraud_security_alerts alert
  SET
    read_at = COALESCE(alert.read_at, now()),
    read_by = p_user_id,
    status = 'reviewed',
    updated_at = now()
  WHERE alert.id = p_alert_id;

  RETURN QUERY
  SELECT alert.id, alert.read_at, alert.status
  FROM public.anti_fraud_security_alerts alert
  WHERE alert.id = p_alert_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.mark_anti_fraud_security_alert_read(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_anti_fraud_security_alert_from_blocked_attempt(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_anti_fraud_security_alert_from_blocked_attempt(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_anti_fraud_security_alert_from_blocked_attempt(uuid) FROM authenticated;

DO $$
DECLARE
  v_attempt_id uuid;
BEGIN
  FOR v_attempt_id IN
    SELECT id
    FROM public.anti_fraud_blocked_attempts
    WHERE reason = 'cooldown_active'
    ORDER BY attempted_at ASC, id ASC
  LOOP
    PERFORM public.upsert_anti_fraud_security_alert_from_blocked_attempt(v_attempt_id);
  END LOOP;
END $$;