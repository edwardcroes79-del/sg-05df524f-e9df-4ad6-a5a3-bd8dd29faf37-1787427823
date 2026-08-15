-- Customers (global pool, linked to auth.users)
CREATE TABLE public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Businesses
CREATE TABLE public.businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    business_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo TEXT,
    cover_image TEXT,
    description TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    primary_color TEXT,
    secondary_color TEXT,
    status TEXT DEFAULT 'active',
    subscription_plan TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Business Users (Staff)
CREATE TABLE public.business_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id, user_id)
);

-- Loyalty Programs
CREATE TABLE public.loyalty_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    stamp_target INTEGER NOT NULL DEFAULT 10,
    reward_title TEXT NOT NULL,
    reward_description TEXT,
    reward_image TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Loyalty Cards
CREATE TABLE public.customer_loyalty_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    loyalty_program_id UUID REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
    current_stamps INTEGER DEFAULT 0,
    total_stamps INTEGER DEFAULT 0,
    rewards_earned INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(customer_id, loyalty_program_id)
);

-- Stamp Transactions
CREATE TABLE public.stamp_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id),
    business_id UUID REFERENCES public.businesses(id),
    loyalty_program_id UUID REFERENCES public.loyalty_programs(id),
    loyalty_card_id UUID REFERENCES public.customer_loyalty_cards(id),
    staff_user_id UUID REFERENCES auth.users(id),
    stamp_type TEXT DEFAULT 'earned',
    stamp_number INTEGER NOT NULL,
    verification_method TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Rewards
CREATE TABLE public.rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    loyalty_program_id UUID REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    reward_code TEXT UNIQUE NOT NULL,
    reward_title TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    earned_at TIMESTAMPTZ DEFAULT now(),
    redeemed_at TIMESTAMPTZ,
    redeemed_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ
);

-- QR Codes
CREATE TABLE public.qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    loyalty_program_id UUID REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Future Payment Tables (Prepared Architecture)
CREATE TABLE public.payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_transaction_id TEXT,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'AWG',
    status TEXT DEFAULT 'pending',
    payment_type TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.subscription_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    external_transaction_id TEXT,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'AWG',
    status TEXT DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies for Phase 1 Setup (T2/T1 variations)
-- We will expand these with more granular roles in Phase 2 (Auth implementation)

-- Businesses: Owners can see and edit their businesses. Public can see active businesses.
CREATE POLICY "Public read businesses" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "Owners manage businesses" ON public.businesses FOR ALL USING (auth.uid() = owner_id);

-- Customers: Customers manage their own profile
CREATE POLICY "Users manage own customer profile" ON public.customers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read customers" ON public.customers FOR SELECT USING (true);

-- Loyalty Programs: Public can read, only business owners/staff can write (simplified to owners for DB seed)
CREATE POLICY "Public read programs" ON public.loyalty_programs FOR SELECT USING (true);

-- Customer Loyalty Cards: Customer can read own, business can read/write.
CREATE POLICY "Customer read own cards" ON public.customer_loyalty_cards FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);