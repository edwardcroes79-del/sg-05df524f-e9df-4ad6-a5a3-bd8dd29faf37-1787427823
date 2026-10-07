BEGIN;

INSERT INTO public.plan_entitlements (plan_id, key, value_type, boolean_value, number_value, text_value)
VALUES
  ('mega_plan', 'quick_stamp_qr', 'boolean', true, null, null),
  ('mega_plan', 'advanced_analytics', 'boolean', true, null, null),
  ('mega_plan', 'max_locations', 'number', null, 10, null)
ON CONFLICT (plan_id, key) DO UPDATE
SET
  value_type = EXCLUDED.value_type,
  boolean_value = EXCLUDED.boolean_value,
  number_value = EXCLUDED.number_value,
  text_value = EXCLUDED.text_value,
  updated_at = now()
WHERE public.plan_entitlements.plan_id = 'mega_plan';

CREATE TABLE IF NOT EXISTS public.business_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  address text,
  phone text,
  email text,
  manager_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'temporarily_closed', 'inactive')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_locations_business_slug_unique UNIQUE (business_id, slug)
);

CREATE TABLE IF NOT EXISTS public.business_user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL REFERENCES public.business_users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('corporate_admin', 'location_manager', 'staff')),
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_user_locations_unique UNIQUE (business_user_id, location_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS business_user_locations_default_unique
ON public.business_user_locations (business_user_id)
WHERE is_default = true AND status = 'active';

CREATE TABLE IF NOT EXISTS public.loyalty_program_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  loyalty_program_id uuid NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.business_locations(id) ON DELETE CASCADE,
  availability text NOT NULL DEFAULT 'location_specific' CHECK (availability IN ('corporate_wide', 'location_specific')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_program_locations_unique UNIQUE (loyalty_program_id, location_id),
  CONSTRAINT loyalty_program_locations_scope CHECK (
    (availability = 'corporate_wide' AND location_id IS NULL)
    OR (availability = 'location_specific' AND location_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_program_locations_corporate_wide_unique
ON public.loyalty_program_locations (loyalty_program_id)
WHERE availability = 'corporate_wide' AND location_id IS NULL;

ALTER TABLE public.stamp_transactions
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_locations(id) ON DELETE SET NULL;

ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS earned_location_id uuid REFERENCES public.business_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redeemed_location_id uuid REFERENCES public.business_locations(id) ON DELETE SET NULL;

ALTER TABLE public.qr_codes
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_locations(id) ON DELETE SET NULL;

ALTER TABLE public.quick_stamp_qr_tokens
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.business_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_business_locations_business_status
ON public.business_locations (business_id, status);

CREATE INDEX IF NOT EXISTS idx_business_locations_business_slug
ON public.business_locations (business_id, slug);

CREATE INDEX IF NOT EXISTS idx_business_user_locations_business_user
ON public.business_user_locations (business_user_id, status);

CREATE INDEX IF NOT EXISTS idx_business_user_locations_business_location
ON public.business_user_locations (business_id, location_id, status);

CREATE INDEX IF NOT EXISTS idx_business_user_locations_location
ON public.business_user_locations (location_id, status);

CREATE INDEX IF NOT EXISTS idx_loyalty_program_locations_business_program
ON public.loyalty_program_locations (business_id, loyalty_program_id, status);

CREATE INDEX IF NOT EXISTS idx_loyalty_program_locations_location
ON public.loyalty_program_locations (location_id, status);

CREATE INDEX IF NOT EXISTS idx_stamp_transactions_business_location_created
ON public.stamp_transactions (business_id, location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rewards_business_earned_location
ON public.rewards (business_id, earned_location_id, status);

CREATE INDEX IF NOT EXISTS idx_rewards_business_redeemed_location
ON public.rewards (business_id, redeemed_location_id, status);

CREATE INDEX IF NOT EXISTS idx_qr_codes_business_location
ON public.qr_codes (business_id, location_id, active);

CREATE INDEX IF NOT EXISTS idx_quick_stamp_qr_tokens_business_location
ON public.quick_stamp_qr_tokens (business_id, location_id);

CREATE OR REPLACE FUNCTION public.is_corporate_business(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = target_business_id
      AND b.subscription_plan = 'mega_plan'
      AND COALESCE(b.subscription_status, '') IN ('active', 'trialing', 'approved')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(target_business_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = target_business_id
      AND bu.user_id = target_user_id
      AND bu.status = 'active'
  )
  OR EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = target_business_id
      AND b.owner_id = target_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_corporate_admin_for_business(target_business_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_corporate_business(target_business_id)
    AND (
      EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id = target_business_id
          AND b.owner_id = target_user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.business_users bu
        WHERE bu.business_id = target_business_id
          AND bu.user_id = target_user_id
          AND bu.status = 'active'
          AND bu.role IN ('owner', 'admin', 'corporate_admin')
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_has_business_location_access(target_business_id uuid, target_location_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    target_location_id IS NULL
    OR public.is_corporate_admin_for_business(target_business_id, target_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.business_users bu
      JOIN public.business_user_locations bul ON bul.business_user_id = bu.id
      WHERE bu.business_id = target_business_id
        AND bu.user_id = target_user_id
        AND bu.status = 'active'
        AND bul.business_id = target_business_id
        AND bul.location_id = target_location_id
        AND bul.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_business_location(target_business_id uuid, target_location_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_corporate_admin_for_business(target_business_id, target_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.business_users bu
      JOIN public.business_user_locations bul ON bul.business_user_id = bu.id
      WHERE bu.business_id = target_business_id
        AND bu.user_id = target_user_id
        AND bu.status = 'active'
        AND bul.business_id = target_business_id
        AND bul.location_id = target_location_id
        AND bul.status = 'active'
        AND bul.role IN ('location_manager', 'corporate_admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.can_use_program_at_location(target_business_id uuid, target_program_id uuid, target_location_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    target_location_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.loyalty_program_locations lpl
      WHERE lpl.business_id = target_business_id
        AND lpl.loyalty_program_id = target_program_id
        AND lpl.status = 'active'
    )
    OR EXISTS (
      SELECT 1
      FROM public.loyalty_program_locations lpl
      WHERE lpl.business_id = target_business_id
        AND lpl.loyalty_program_id = target_program_id
        AND lpl.status = 'active'
        AND (
          lpl.availability = 'corporate_wide'
          OR lpl.location_id = target_location_id
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_business_locations_updated_at ON public.business_locations;
CREATE TRIGGER set_business_locations_updated_at
BEFORE UPDATE ON public.business_locations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_business_user_locations_updated_at ON public.business_user_locations;
CREATE TRIGGER set_business_user_locations_updated_at
BEFORE UPDATE ON public.business_user_locations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_loyalty_program_locations_updated_at ON public.loyalty_program_locations;
CREATE TRIGGER set_loyalty_program_locations_updated_at
BEFORE UPDATE ON public.loyalty_program_locations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_program_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_locations_select_access" ON public.business_locations;
CREATE POLICY "business_locations_select_access"
ON public.business_locations
FOR SELECT
USING (
  public.is_super_admin_user(auth.uid())
  OR public.is_business_member(business_id)
);

DROP POLICY IF EXISTS "business_locations_insert_corporate_admin" ON public.business_locations;
CREATE POLICY "business_locations_insert_corporate_admin"
ON public.business_locations
FOR INSERT
WITH CHECK (
  public.is_super_admin_user(auth.uid())
  OR public.is_corporate_admin_for_business(business_id)
);

DROP POLICY IF EXISTS "business_locations_update_corporate_or_manager" ON public.business_locations;
CREATE POLICY "business_locations_update_corporate_or_manager"
ON public.business_locations
FOR UPDATE
USING (
  public.is_super_admin_user(auth.uid())
  OR public.can_manage_business_location(business_id, id)
)
WITH CHECK (
  public.is_super_admin_user(auth.uid())
  OR public.can_manage_business_location(business_id, id)
);

DROP POLICY IF EXISTS "business_user_locations_select_access" ON public.business_user_locations;
CREATE POLICY "business_user_locations_select_access"
ON public.business_user_locations
FOR SELECT
USING (
  public.is_super_admin_user(auth.uid())
  OR public.is_business_member(business_id)
);

DROP POLICY IF EXISTS "business_user_locations_insert_corporate_admin" ON public.business_user_locations;
CREATE POLICY "business_user_locations_insert_corporate_admin"
ON public.business_user_locations
FOR INSERT
WITH CHECK (
  public.is_super_admin_user(auth.uid())
  OR public.is_corporate_admin_for_business(business_id)
);

DROP POLICY IF EXISTS "business_user_locations_update_corporate_admin" ON public.business_user_locations;
CREATE POLICY "business_user_locations_update_corporate_admin"
ON public.business_user_locations
FOR UPDATE
USING (
  public.is_super_admin_user(auth.uid())
  OR public.is_corporate_admin_for_business(business_id)
)
WITH CHECK (
  public.is_super_admin_user(auth.uid())
  OR public.is_corporate_admin_for_business(business_id)
);

DROP POLICY IF EXISTS "loyalty_program_locations_select_access" ON public.loyalty_program_locations;
CREATE POLICY "loyalty_program_locations_select_access"
ON public.loyalty_program_locations
FOR SELECT
USING (
  public.is_super_admin_user(auth.uid())
  OR public.is_business_member(business_id)
);

DROP POLICY IF EXISTS "loyalty_program_locations_write_corporate_admin" ON public.loyalty_program_locations;
CREATE POLICY "loyalty_program_locations_write_corporate_admin"
ON public.loyalty_program_locations
FOR ALL
USING (
  public.is_super_admin_user(auth.uid())
  OR public.is_corporate_admin_for_business(business_id)
)
WITH CHECK (
  public.is_super_admin_user(auth.uid())
  OR public.is_corporate_admin_for_business(business_id)
);

CREATE OR REPLACE FUNCTION public.audit_business_location_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (admin_user_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN 'business_location_created' ELSE 'business_location_updated' END,
    'business_location',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'business_id', COALESCE(NEW.business_id, OLD.business_id),
      'status', COALESCE(NEW.status, OLD.status),
      'operation', TG_OP
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_business_locations_changes ON public.business_locations;
CREATE TRIGGER audit_business_locations_changes
AFTER INSERT OR UPDATE ON public.business_locations
FOR EACH ROW EXECUTE FUNCTION public.audit_business_location_change();

CREATE OR REPLACE FUNCTION public.audit_business_user_location_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (admin_user_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN 'business_user_location_assigned' ELSE 'business_user_location_updated' END,
    'business_user_location',
    COALESCE(NEW.id, OLD.id)::text,
    jsonb_build_object(
      'business_id', COALESCE(NEW.business_id, OLD.business_id),
      'location_id', COALESCE(NEW.location_id, OLD.location_id),
      'business_user_id', COALESCE(NEW.business_user_id, OLD.business_user_id),
      'role', COALESCE(NEW.role, OLD.role),
      'status', COALESCE(NEW.status, OLD.status),
      'operation', TG_OP
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_business_user_locations_changes ON public.business_user_locations;
CREATE TRIGGER audit_business_user_locations_changes
AFTER INSERT OR UPDATE ON public.business_user_locations
FOR EACH ROW EXECUTE FUNCTION public.audit_business_user_location_change();

COMMIT;