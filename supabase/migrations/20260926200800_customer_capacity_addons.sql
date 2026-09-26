CREATE TABLE IF NOT EXISTS public.subscription_addons (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  addon_type text NOT NULL DEFAULT 'customer_capacity',
  capacity_amount integer NOT NULL DEFAULT 0 CHECK (capacity_amount >= 0),
  monthly_price_awg numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (monthly_price_awg >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  display_order integer NOT NULL DEFAULT 100,
  provider text,
  provider_product_id text,
  provider_price_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  archived_at timestamp with time zone
);

ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read subscription_addons" ON public.subscription_addons;
CREATE POLICY "Public read subscription_addons"
ON public.subscription_addons
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Super admin manage subscription_addons" ON public.subscription_addons;
CREATE POLICY "Super admin manage subscription_addons"
ON public.subscription_addons
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role = 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role = 'super_admin')
  )
);

CREATE INDEX IF NOT EXISTS idx_subscription_addons_type_status
ON public.subscription_addons(addon_type, status);

CREATE INDEX IF NOT EXISTS idx_subscription_addons_display_order
ON public.subscription_addons(display_order);

INSERT INTO public.subscription_addons (
  id,
  name,
  slug,
  description,
  addon_type,
  capacity_amount,
  monthly_price_awg,
  status,
  display_order,
  metadata,
  updated_at
)
VALUES
  ('customer_capacity_100', '+100 Customers', 'customer-capacity-100', 'Adds capacity for 100 additional customer/member records.', 'customer_capacity', 100, 5.00, 'active', 10, '{"entitlement_key":"max_customers"}'::jsonb, now()),
  ('customer_capacity_250', '+250 Customers', 'customer-capacity-250', 'Adds capacity for 250 additional customer/member records.', 'customer_capacity', 250, 8.00, 'active', 20, '{"entitlement_key":"max_customers"}'::jsonb, now()),
  ('customer_capacity_500', '+500 Customers', 'customer-capacity-500', 'Adds capacity for 500 additional customer/member records.', 'customer_capacity', 500, 12.00, 'active', 30, '{"entitlement_key":"max_customers"}'::jsonb, now()),
  ('customer_capacity_1000', '+1,000 Customers', 'customer-capacity-1000', 'Adds capacity for 1,000 additional customer/member records.', 'customer_capacity', 1000, 20.00, 'active', 40, '{"entitlement_key":"max_customers"}'::jsonb, now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  addon_type = EXCLUDED.addon_type,
  capacity_amount = EXCLUDED.capacity_amount,
  monthly_price_awg = EXCLUDED.monthly_price_awg,
  display_order = EXCLUDED.display_order,
  metadata = EXCLUDED.metadata,
  updated_at = now();