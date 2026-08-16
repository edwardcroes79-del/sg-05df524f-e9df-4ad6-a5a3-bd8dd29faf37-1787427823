-- Add max_staff to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_staff integer NOT NULL DEFAULT 1;

-- Update existing plans with sensible defaults
UPDATE public.subscription_plans SET max_staff = 1 WHERE id = 'free';
UPDATE public.subscription_plans SET max_staff = 3 WHERE id = 'business';
UPDATE public.subscription_plans SET max_staff = 10 WHERE id = 'professional';

-- Fix the RLS policies for business_users
DROP POLICY IF EXISTS "Users view own business relationships" ON public.business_users;
CREATE POLICY "Users view own business relationships and owners view staff" ON public.business_users
  FOR SELECT USING (
    auth.uid() = user_id OR 
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Business owners manage staff" ON public.business_users;
CREATE POLICY "Business owners manage staff" ON public.business_users
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );