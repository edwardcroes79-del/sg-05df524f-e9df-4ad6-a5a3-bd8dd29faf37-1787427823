ALTER TABLE public.customer_loyalty_cards
ADD COLUMN IF NOT EXISTS is_vip boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_customer_loyalty_cards_business_program_vip
ON public.customer_loyalty_cards (business_id, loyalty_program_id, is_vip)
WHERE status = 'active';

INSERT INTO public.plan_entitlements (plan_id, key, value_type, boolean_value)
VALUES
  ('mega_plan', 'vip_member_identification', 'boolean', true),
  ('Enterprise', 'vip_member_identification', 'boolean', true)
ON CONFLICT (plan_id, key)
DO UPDATE SET
  value_type = EXCLUDED.value_type,
  boolean_value = EXCLUDED.boolean_value,
  numeric_value = NULL,
  text_value = NULL,
  updated_at = now();