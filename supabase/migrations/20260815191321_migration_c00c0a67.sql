-- ============================================================================
-- PHASE 8: PERFORMANCE INDEXES (NON-BLOCKING, SAFE TO EXECUTE)
-- ============================================================================

-- Stamp transactions indexes (critical for analytics queries)
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_customer_id 
ON public.stamp_transactions(customer_id);

CREATE INDEX IF NOT EXISTS idx_stamp_transactions_business_id 
ON public.stamp_transactions(business_id);

CREATE INDEX IF NOT EXISTS idx_stamp_transactions_loyalty_program_id 
ON public.stamp_transactions(loyalty_program_id);

CREATE INDEX IF NOT EXISTS idx_stamp_transactions_created_at 
ON public.stamp_transactions(created_at DESC);

-- Rewards indexes (critical for customer lookups)
CREATE INDEX IF NOT EXISTS idx_rewards_customer_id 
ON public.rewards(customer_id);

CREATE INDEX IF NOT EXISTS idx_rewards_business_id 
ON public.rewards(business_id);

CREATE INDEX IF NOT EXISTS idx_rewards_status 
ON public.rewards(status);

CREATE INDEX IF NOT EXISTS idx_rewards_reward_code 
ON public.rewards(reward_code);

-- Customer loyalty cards indexes
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_cards_customer_id 
ON public.customer_loyalty_cards(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_loyalty_cards_business_id 
ON public.customer_loyalty_cards(business_id);

CREATE INDEX IF NOT EXISTS idx_customer_loyalty_cards_loyalty_program_id 
ON public.customer_loyalty_cards(loyalty_program_id);

-- Payment transactions indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_business_id 
ON public.payment_transactions(business_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_id 
ON public.payment_transactions(customer_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
ON public.payment_transactions(status);

-- Subscription payments indexes
CREATE INDEX IF NOT EXISTS idx_subscription_payments_business_id 
ON public.subscription_payments(business_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_status 
ON public.subscription_payments(status);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_reference 
ON public.subscription_payments(payment_reference);

-- Business users indexes
CREATE INDEX IF NOT EXISTS idx_business_users_user_id 
ON public.business_users(user_id);

CREATE INDEX IF NOT EXISTS idx_business_users_business_id 
ON public.business_users(business_id);

-- Businesses indexes
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id 
ON public.businesses(owner_id);

CREATE INDEX IF NOT EXISTS idx_businesses_slug 
ON public.businesses(slug);

CREATE INDEX IF NOT EXISTS idx_businesses_status 
ON public.businesses(status);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id 
ON public.customers(user_id);

-- Loyalty programs indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_business_id 
ON public.loyalty_programs(business_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_programs_active 
ON public.loyalty_programs(active);

-- QR codes indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_business_id 
ON public.qr_codes(business_id);

CREATE INDEX IF NOT EXISTS idx_qr_codes_loyalty_program_id 
ON public.qr_codes(loyalty_program_id);

CREATE INDEX IF NOT EXISTS idx_qr_codes_active 
ON public.qr_codes(active);