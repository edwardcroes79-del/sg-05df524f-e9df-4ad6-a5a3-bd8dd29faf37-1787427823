ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

UPDATE public.subscription_plans
SET visibility = 'public'
WHERE visibility IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscription_plans_visibility_check'
      AND conrelid = 'public.subscription_plans'::regclass
  ) THEN
    ALTER TABLE public.subscription_plans
    ADD CONSTRAINT subscription_plans_visibility_check
    CHECK (visibility IN ('public', 'private'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_public_visibility
ON public.subscription_plans (visibility, status, is_active, display_order);

NOTIFY pgrst, 'reload schema';