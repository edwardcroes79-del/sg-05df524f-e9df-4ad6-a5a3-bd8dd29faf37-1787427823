ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS annual_price_awg numeric(12,2),
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS display_order integer,
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.subscription_plans
SET status = CASE
  WHEN archived_at IS NOT NULL THEN 'archived'
  WHEN COALESCE(is_active, true) THEN 'active'
  ELSE 'inactive'
END
WHERE status IS NULL;

UPDATE public.subscription_plans
SET display_order = ranked.display_order
FROM (
  SELECT id, row_number() OVER (ORDER BY price_awg ASC, name ASC)::integer AS display_order
  FROM public.subscription_plans
) ranked
WHERE subscription_plans.id = ranked.id
  AND subscription_plans.display_order IS NULL;

ALTER TABLE public.subscription_plans
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN display_order SET DEFAULT 100;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_plans_status_check'
      AND conrelid = 'public.subscription_plans'::regclass
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_status_check
      CHECK (status IN ('active', 'inactive', 'archived'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  key text NOT NULL,
  value_type text NOT NULL DEFAULT 'boolean',
  boolean_value boolean,
  number_value numeric,
  text_value text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plan_entitlements_plan_key_unique UNIQUE (plan_id, key),
  CONSTRAINT plan_entitlements_value_type_check CHECK (value_type IN ('boolean', 'number', 'text'))
);

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plan_entitlements'
      AND policyname = 'Allow public read plan_entitlements'
  ) THEN
    CREATE POLICY "Allow public read plan_entitlements"
      ON public.plan_entitlements
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'plan_entitlements'
      AND policyname = 'Allow super admin all on plan_entitlements'
  ) THEN
    CREATE POLICY "Allow super admin all on plan_entitlements"
      ON public.plan_entitlements
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
      );
  END IF;
END $$;

INSERT INTO public.plan_entitlements (plan_id, key, value_type, boolean_value)
SELECT id, 'premium_templates', 'boolean', COALESCE(includes_premium_templates, false)
FROM public.subscription_plans
ON CONFLICT (plan_id, key)
DO UPDATE SET
  value_type = EXCLUDED.value_type,
  boolean_value = EXCLUDED.boolean_value,
  updated_at = now();

INSERT INTO public.plan_entitlements (plan_id, key, value_type, boolean_value)
SELECT id, 'reward_expiration', 'boolean', true
FROM public.subscription_plans
ON CONFLICT (plan_id, key)
DO UPDATE SET
  value_type = EXCLUDED.value_type,
  boolean_value = EXCLUDED.boolean_value,
  updated_at = now();

INSERT INTO public.plan_entitlements (plan_id, key, value_type, boolean_value)
SELECT id, 'custom_card_branding', 'boolean', COALESCE(includes_premium_templates, false)
FROM public.subscription_plans
ON CONFLICT (plan_id, key)
DO UPDATE SET
  value_type = EXCLUDED.value_type,
  boolean_value = EXCLUDED.boolean_value,
  updated_at = now();

INSERT INTO public.plan_entitlements (plan_id, key, value_type, number_value)
SELECT id, 'max_loyalty_programs', 'number', max_loyalty_programs
FROM public.subscription_plans
ON CONFLICT (plan_id, key)
DO UPDATE SET
  value_type = EXCLUDED.value_type,
  number_value = EXCLUDED.number_value,
  updated_at = now();

INSERT INTO public.plan_entitlements (plan_id, key, value_type, number_value)
SELECT id, 'max_customers', 'number', max_customers
FROM public.subscription_plans
ON CONFLICT (plan_id, key)
DO UPDATE SET
  value_type = EXCLUDED.value_type,
  number_value = EXCLUDED.number_value,
  updated_at = now();

INSERT INTO public.plan_entitlements (plan_id, key, value_type, number_value)
SELECT id, 'max_staff', 'number', max_staff
FROM public.subscription_plans
ON CONFLICT (plan_id, key)
DO UPDATE SET
  value_type = EXCLUDED.value_type,
  number_value = EXCLUDED.number_value,
  updated_at = now();

UPDATE public.subscription_plans
SET
  price_awg = CASE lower(name)
    WHEN 'starter' THEN 35.00
    WHEN 'business' THEN 65.00
    WHEN 'enterprise' THEN 125.00
    ELSE price_awg
  END,
  updated_at = now()
WHERE lower(name) IN ('starter', 'business', 'enterprise');