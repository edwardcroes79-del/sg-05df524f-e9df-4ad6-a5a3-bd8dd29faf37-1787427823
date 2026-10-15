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