ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS contract_term_months integer,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS contract_status text,
  ADD COLUMN IF NOT EXISTS renewal_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_contract_term_months_check'
      AND conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_contract_term_months_check
      CHECK (contract_term_months IS NULL OR contract_term_months IN (6, 12));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_contract_status_check'
      AND conrelid = 'public.businesses'::regclass
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_contract_status_check
      CHECK (contract_status IS NULL OR contract_status IN ('active', 'expiring', 'expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_contract_status ON public.businesses(contract_status);
CREATE INDEX IF NOT EXISTS idx_businesses_contract_end_date ON public.businesses(contract_end_date);

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'businesses'
  AND column_name IN (
    'contract_term_months',
    'contract_start_date',
    'contract_end_date',
    'contract_status',
    'renewal_date'
  )
ORDER BY column_name;