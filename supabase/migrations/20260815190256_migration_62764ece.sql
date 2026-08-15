-- Enhance subscription_payments table for bank transfer workflow
ALTER TABLE public.subscription_payments
ADD COLUMN IF NOT EXISTS plan_id text REFERENCES public.subscription_plans(id),
ADD COLUMN IF NOT EXISTS payment_proof_url text,
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS admin_notes text,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create platform bank account configuration table
CREATE TABLE IF NOT EXISTS public.platform_bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name text NOT NULL,
    account_holder text NOT NULL,
    account_number text NOT NULL,
    currency text NOT NULL DEFAULT 'AWG',
    instructions text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Insert default Aruba bank account for manual transfers
INSERT INTO public.platform_bank_accounts (bank_name, account_holder, account_number, currency, instructions)
VALUES (
    'Aruba Bank',
    'Aruba Royalty Stamp BV',
    '1234567890',
    'AWG',
    'Please include your payment reference number in the transfer description. Upload your payment receipt after completing the transfer.'
)
ON CONFLICT DO NOTHING;

-- Enable RLS on platform_bank_accounts
ALTER TABLE public.platform_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read active bank accounts
CREATE POLICY "Public read active bank accounts" ON public.platform_bank_accounts
    FOR SELECT
    USING (is_active = true);

-- Policy: Super admin can manage all bank accounts
CREATE POLICY "Super admin manage bank accounts" ON public.platform_bank_accounts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );

-- Update RLS policies on subscription_payments for business owners and super admin
DROP POLICY IF EXISTS "Business owners manage own subscription payments" ON public.subscription_payments;
CREATE POLICY "Business owners manage own subscription payments" ON public.subscription_payments
    FOR ALL
    USING (
        business_id IN (
            SELECT id FROM public.businesses WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Super admin manage all subscription payments" ON public.subscription_payments;
CREATE POLICY "Super admin manage all subscription payments" ON public.subscription_payments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_super_admin = true
        )
    );