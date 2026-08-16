ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 14;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS trial_start timestamp with time zone;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS trial_end timestamp with time zone;

INSERT INTO public.subscription_plans (id, name, price_awg, max_loyalty_programs, max_customers, features, max_staff, is_trial, trial_days, is_active)
VALUES ('trial', 'Free 14-Day Trial', 0, 1, 50, '{}', 1, true, 14, true)
ON CONFLICT (id) DO UPDATE 
SET is_trial = true;