BEGIN;

CREATE FUNCTION public.is_valid_birth_month_day(p_month integer, p_day integer)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_month BETWEEN 1 AND 12
    AND p_day BETWEEN 1 AND 31
    AND (
      (p_month IN (1, 3, 5, 7, 8, 10, 12) AND p_day <= 31)
      OR (p_month IN (4, 6, 9, 11) AND p_day <= 30)
      OR (p_month = 2 AND p_day <= 29)
    );
$$;

CREATE FUNCTION public.set_birthday_rewards_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.customer_birthdays (
  customer_id uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  birth_month integer NOT NULL,
  birth_day integer NOT NULL,
  registered_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  registered_at timestamptz NOT NULL DEFAULT now(),
  corrected_at timestamptz,
  corrected_by_admin_user_id uuid REFERENCES auth.users(id),
  correction_reason text,
  previous_birth_month integer,
  previous_birth_day integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_birthdays_valid_birth_date CHECK (public.is_valid_birth_month_day(birth_month, birth_day)),
  CONSTRAINT customer_birthdays_valid_previous_birth_date CHECK (
    (previous_birth_month IS NULL AND previous_birth_day IS NULL)
    OR (
      previous_birth_month IS NOT NULL
      AND previous_birth_day IS NOT NULL
      AND public.is_valid_birth_month_day(previous_birth_month, previous_birth_day)
    )
  ),
  CONSTRAINT customer_birthdays_correction_reason_required CHECK (
    corrected_at IS NULL
    OR (
      corrected_by_admin_user_id IS NOT NULL
      AND correction_reason IS NOT NULL
      AND length(btrim(correction_reason)) >= 10
    )
  )
);

CREATE TRIGGER set_customer_birthdays_updated_at
BEFORE UPDATE ON public.customer_birthdays
FOR EACH ROW
EXECUTE FUNCTION public.set_birthday_rewards_updated_at();

CREATE TABLE public.customer_birthday_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  corrected_by_admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  previous_birth_month integer NOT NULL,
  previous_birth_day integer NOT NULL,
  new_birth_month integer NOT NULL,
  new_birth_day integer NOT NULL,
  correction_reason text NOT NULL,
  corrected_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT customer_birthday_corrections_previous_valid CHECK (
    public.is_valid_birth_month_day(previous_birth_month, previous_birth_day)
  ),
  CONSTRAINT customer_birthday_corrections_new_valid CHECK (
    public.is_valid_birth_month_day(new_birth_month, new_birth_day)
  ),
  CONSTRAINT customer_birthday_corrections_reason_required CHECK (
    length(btrim(correction_reason)) >= 10
  )
);

CREATE TABLE public.customer_notification_preferences (
  customer_id uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  birthday_rewards_email_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_customer_notification_preferences_updated_at
BEFORE UPDATE ON public.customer_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.set_birthday_rewards_updated_at();

CREATE TABLE public.business_birthday_reward_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  bonus_stamps integer NOT NULL DEFAULT 1,
  greeting_template text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_birthday_reward_settings_bonus_one CHECK (bonus_stamps = 1),
  CONSTRAINT business_birthday_reward_settings_greeting_length CHECK (
    greeting_template IS NULL OR length(greeting_template) <= 500
  )
);

CREATE TRIGGER set_business_birthday_reward_settings_updated_at
BEFORE UPDATE ON public.business_birthday_reward_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_birthday_rewards_updated_at();

CREATE TABLE public.birthday_reward_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  loyalty_program_id uuid NOT NULL REFERENCES public.loyalty_programs(id),
  loyalty_card_id uuid NOT NULL REFERENCES public.customer_loyalty_cards(id),
  birthday_year integer NOT NULL,
  birthday_date date NOT NULL,
  status text NOT NULL DEFAULT 'reserved',
  stamp_transaction_id uuid REFERENCES public.stamp_transactions(id),
  reward_id uuid REFERENCES public.rewards(id),
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  reserved_at timestamptz,
  awarded_at timestamptz,
  notification_status text,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT birthday_reward_awards_year_reasonable CHECK (birthday_year BETWEEN 2000 AND 2200),
  CONSTRAINT birthday_reward_awards_status_valid CHECK (
    status IN ('reserved', 'awarded', 'failed', 'skipped')
  ),
  CONSTRAINT birthday_reward_awards_notification_status_valid CHECK (
    notification_status IS NULL
    OR notification_status IN ('pending', 'sent', 'failed', 'skipped')
  ),
  CONSTRAINT birthday_reward_awards_attempt_count_nonnegative CHECK (attempt_count >= 0),
  CONSTRAINT birthday_reward_awards_awarded_requires_stamp CHECK (
    status <> 'awarded'
    OR (stamp_transaction_id IS NOT NULL AND awarded_at IS NOT NULL)
  ),
  CONSTRAINT birthday_reward_awards_notification_requires_award CHECK (
    notification_status IS NULL
    OR status = 'awarded'
  ),
  CONSTRAINT birthday_reward_awards_unique_customer_business_year UNIQUE (customer_id, business_id, birthday_year)
);

CREATE INDEX customer_birthday_corrections_customer_idx
ON public.customer_birthday_corrections (customer_id, corrected_at DESC);

CREATE INDEX customer_birthday_corrections_admin_idx
ON public.customer_birthday_corrections (corrected_by_admin_user_id, corrected_at DESC);

CREATE INDEX birthday_reward_awards_business_year_idx
ON public.birthday_reward_awards (business_id, birthday_year);

CREATE INDEX birthday_reward_awards_customer_business_idx
ON public.birthday_reward_awards (customer_id, business_id);

CREATE INDEX birthday_reward_awards_status_updated_idx
ON public.birthday_reward_awards (status, updated_at);

CREATE INDEX birthday_reward_awards_birthday_date_status_idx
ON public.birthday_reward_awards (birthday_date, status);

CREATE INDEX birthday_reward_awards_notification_status_idx
ON public.birthday_reward_awards (notification_status, updated_at)
WHERE notification_status IS NOT NULL;

CREATE INDEX customer_birthdays_birth_date_idx
ON public.customer_birthdays (birth_month, birth_day);

ALTER TABLE public.customer_birthdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_birthday_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_birthday_reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_reward_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_birthdays_select_own"
ON public.customer_birthdays
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = customer_birthdays.customer_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "customer_birthdays_insert_own_once"
ON public.customer_birthdays
FOR INSERT
WITH CHECK (
  registered_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = customer_birthdays.customer_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "customer_birthday_corrections_select_super_admin"
ON public.customer_birthday_corrections
FOR SELECT
USING (public.is_super_admin_user(auth.uid()));

CREATE POLICY "customer_notification_preferences_select_own"
ON public.customer_notification_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = customer_notification_preferences.customer_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "customer_notification_preferences_insert_own"
ON public.customer_notification_preferences
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = customer_notification_preferences.customer_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "customer_notification_preferences_update_own"
ON public.customer_notification_preferences
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = customer_notification_preferences.customer_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = customer_notification_preferences.customer_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "business_birthday_reward_settings_select_accessible_business"
ON public.business_birthday_reward_settings
FOR SELECT
USING (public.can_access_business(business_id));

CREATE POLICY "business_birthday_reward_settings_insert_owner_admin"
ON public.business_birthday_reward_settings
FOR INSERT
WITH CHECK (
  public.is_super_admin_user(auth.uid())
  OR public.check_business_ownership(business_id, auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = business_birthday_reward_settings.business_id
      AND bu.user_id = auth.uid()
      AND bu.status = 'active'
      AND bu.role = 'owner'
      AND public.is_business_contract_accessible(bu.business_id)
  )
);

CREATE POLICY "business_birthday_reward_settings_update_owner_admin"
ON public.business_birthday_reward_settings
FOR UPDATE
USING (
  public.is_super_admin_user(auth.uid())
  OR public.check_business_ownership(business_id, auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = business_birthday_reward_settings.business_id
      AND bu.user_id = auth.uid()
      AND bu.status = 'active'
      AND bu.role = 'owner'
      AND public.is_business_contract_accessible(bu.business_id)
  )
)
WITH CHECK (
  public.is_super_admin_user(auth.uid())
  OR public.check_business_ownership(business_id, auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = business_birthday_reward_settings.business_id
      AND bu.user_id = auth.uid()
      AND bu.status = 'active'
      AND bu.role = 'owner'
      AND public.is_business_contract_accessible(bu.business_id)
  )
);

CREATE POLICY "birthday_reward_awards_select_own_customer"
ON public.birthday_reward_awards
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = birthday_reward_awards.customer_id
      AND c.user_id = auth.uid()
  )
);

REVOKE ALL ON public.customer_birthdays FROM anon, authenticated;
REVOKE ALL ON public.customer_birthday_corrections FROM anon, authenticated;
REVOKE ALL ON public.customer_notification_preferences FROM anon, authenticated;
REVOKE ALL ON public.business_birthday_reward_settings FROM anon, authenticated;
REVOKE ALL ON public.birthday_reward_awards FROM anon, authenticated;

GRANT SELECT, INSERT ON public.customer_birthdays TO authenticated;
GRANT SELECT ON public.customer_birthday_corrections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customer_notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.business_birthday_reward_settings TO authenticated;
GRANT SELECT ON public.birthday_reward_awards TO authenticated;

COMMENT ON TABLE public.customer_birthdays IS 'Private customer birthday month/day registration. Customers can register once; corrections are server-side Super Admin only.';
COMMENT ON TABLE public.customer_birthday_corrections IS 'Append-only Super Admin correction history for customer birthday changes. Not exposed to businesses or customers.';
COMMENT ON TABLE public.customer_notification_preferences IS 'Customer-owned notification preferences separate from stamp receipt email preferences.';
COMMENT ON TABLE public.business_birthday_reward_settings IS 'Per-business Birthday Rewards opt-in settings. Disabled by default.';
COMMENT ON TABLE public.birthday_reward_awards IS 'Birthday Rewards idempotency ledger. Enforces one award per customer, business, and birthday year.';

COMMIT;