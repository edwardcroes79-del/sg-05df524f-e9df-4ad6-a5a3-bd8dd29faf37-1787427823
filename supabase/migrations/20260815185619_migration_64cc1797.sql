-- 1. Create Subscription Plans table if it does not exist
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id text PRIMARY KEY,
    name text NOT NULL,
    price_awg numeric(12,2) NOT NULL DEFAULT 0.00,
    max_loyalty_programs integer NOT NULL DEFAULT 1,
    max_customers integer NOT NULL DEFAULT 300,
    features text[] NOT NULL DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Populate default plans
INSERT INTO public.subscription_plans (id, name, price_awg, max_loyalty_programs, max_customers, features)
VALUES 
    ('starter', 'Starter', 49.00, 1, 300, ARRAY['1 loyalty program', '300 customers', 'Basic analytics', 'QR stamping', 'Digital loyalty cards']),
    ('business', 'Business', 129.00, 5, 1500, ARRAY['Up to 5 loyalty programs', '1,500 customers', 'Advanced analytics', 'Custom branding', 'Staff accounts', 'Reward customization']),
    ('pro', 'Pro', 299.00, 99999, 99999, ARRAY['Unlimited loyalty programs', 'Unlimited customers', 'Advanced analytics', 'Multiple staff', 'Priority support', 'Premium branding', 'Future payment features'])
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    price_awg = EXCLUDED.price_awg,
    max_loyalty_programs = EXCLUDED.max_loyalty_programs,
    max_customers = EXCLUDED.max_customers,
    features = EXCLUDED.features;

-- 3. Add is_super_admin column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- 4. Set the first profile to be Super Admin for developer/testing access
UPDATE public.profiles 
SET is_super_admin = true 
WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1);

-- 5. Set up RLS for subscription_plans (Public read, Super Admin write)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read subscription_plans" ON public.subscription_plans
    FOR SELECT USING (true);

CREATE POLICY "Allow super admin all on subscription_plans" ON public.subscription_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );

-- 6. Grant Super Admin write/manage override capabilities for businesses, customers, programs, cards, stamps, rewards, etc.
-- Let's add policies allowing users with is_super_admin = true full access across tables.
CREATE POLICY "Super admin manage all businesses" ON public.businesses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "Super admin manage all customers" ON public.customers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "Super admin manage all loyalty_programs" ON public.loyalty_programs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "Super admin manage all cards" ON public.customer_loyalty_cards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "Super admin manage all rewards" ON public.rewards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );

CREATE POLICY "Super admin manage all transactions" ON public.stamp_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );