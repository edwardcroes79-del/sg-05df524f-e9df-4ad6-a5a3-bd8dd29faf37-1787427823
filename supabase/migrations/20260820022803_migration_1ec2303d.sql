CREATE INDEX IF NOT EXISTS idx_customer_loyalty_cards_status ON public.customer_loyalty_cards(status);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_cards_business_customer ON public.customer_loyalty_cards(business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_rewards_business_customer_status ON public.rewards(business_id, customer_id, status);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_loyalty_card_created ON public.stamp_transactions(loyalty_card_id, created_at DESC);