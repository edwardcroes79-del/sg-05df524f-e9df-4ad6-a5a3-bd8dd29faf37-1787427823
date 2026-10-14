ALTER TABLE public.customer_loyalty_cards
ADD COLUMN IF NOT EXISTS is_vip boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_customer_loyalty_cards_business_program_vip
ON public.customer_loyalty_cards (business_id, loyalty_program_id, is_vip)
WHERE status = 'active';