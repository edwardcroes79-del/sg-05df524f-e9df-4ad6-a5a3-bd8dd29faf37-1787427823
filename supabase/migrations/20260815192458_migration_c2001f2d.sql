-- ============================================================================
-- FIX: Add missing RLS policies for onboarding flow
-- business_users and loyalty_programs need INSERT policies
-- ============================================================================

-- 1. business_users: Allow users to insert themselves
CREATE POLICY "Users can add themselves to businesses"
ON public.business_users
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- 2. business_users: Users can view their own business relationships
CREATE POLICY "Users view own business relationships"
ON public.business_users
FOR SELECT
TO public
USING (auth.uid() = user_id);

-- 3. loyalty_programs: Business owners can manage their programs
-- We check ownership via the businesses table
CREATE POLICY "Business owners manage programs"
ON public.loyalty_programs
FOR ALL
TO public
USING (
    business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    business_id IN (
        SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
);

-- 4. customer_loyalty_cards: Allow public INSERT for join flow
CREATE POLICY "Public can create loyalty cards"
ON public.customer_loyalty_cards
FOR INSERT
TO public
WITH CHECK (true);