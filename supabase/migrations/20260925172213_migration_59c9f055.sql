ALTER TABLE public.loyalty_programs
ADD COLUMN IF NOT EXISTS reward_expiration_days integer DEFAULT NULL;

ALTER TABLE public.loyalty_programs
DROP CONSTRAINT IF EXISTS loyalty_programs_reward_expiration_days_check;

ALTER TABLE public.loyalty_programs
ADD CONSTRAINT loyalty_programs_reward_expiration_days_check
CHECK (
  reward_expiration_days IS NULL
  OR (reward_expiration_days >= 1 AND reward_expiration_days <= 365)
);