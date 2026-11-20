ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_contract_term_months_check;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_contract_term_months_check
  CHECK (contract_term_months IS NULL OR contract_term_months IN (1, 6, 12));