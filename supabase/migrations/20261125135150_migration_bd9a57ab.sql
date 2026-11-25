CREATE TABLE IF NOT EXISTS public.business_user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role text NOT NULL,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT business_user_presence_role_check CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'corporate_admin'::text, 'location_manager'::text, 'staff'::text]))
);

CREATE INDEX IF NOT EXISTS idx_business_user_presence_business_id ON public.business_user_presence (business_id);
CREATE INDEX IF NOT EXISTS idx_business_user_presence_last_seen_at ON public.business_user_presence (last_seen_at DESC);

ALTER TABLE public.business_user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_user_presence_select_self_or_super_admin ON public.business_user_presence;
CREATE POLICY business_user_presence_select_self_or_super_admin
ON public.business_user_presence
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.is_super_admin = true OR p.role = 'super_admin')
  )
);

CREATE OR REPLACE FUNCTION public.upsert_business_user_presence()
RETURNS public.business_user_presence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  presence_row public.business_user_presence;
  current_user_id uuid := auth.uid();
  resolved_business_id uuid;
  resolved_role text;
  is_super_admin_profile boolean := false;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(p.is_super_admin, false) OR p.role = 'super_admin'
  INTO is_super_admin_profile
  FROM public.profiles p
  WHERE p.id = current_user_id;

  IF COALESCE(is_super_admin_profile, false) THEN
    RAISE EXCEPTION 'Super Admin presence is not tracked';
  END IF;

  SELECT workspace.id
  INTO resolved_business_id
  FROM public.get_business_dashboard_access_status() AS workspace
  LIMIT 1;

  IF resolved_business_id IS NULL THEN
    RAISE EXCEPTION 'No accessible business workspace';
  END IF;

  SELECT
    CASE
      WHEN b.owner_id = current_user_id THEN 'owner'
      ELSE bu.role
    END
  INTO resolved_role
  FROM public.businesses b
  LEFT JOIN public.business_users bu
    ON bu.business_id = b.id
   AND bu.user_id = current_user_id
   AND bu.status = 'active'
  WHERE b.id = resolved_business_id
    AND (b.owner_id = current_user_id OR bu.user_id IS NOT NULL)
  LIMIT 1;

  IF resolved_role IS NULL THEN
    RAISE EXCEPTION 'No active business membership';
  END IF;

  INSERT INTO public.business_user_presence (
    user_id,
    business_id,
    role,
    last_seen_at,
    is_online,
    updated_at
  )
  VALUES (
    current_user_id,
    resolved_business_id,
    resolved_role,
    now(),
    true,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    business_id = EXCLUDED.business_id,
    role = EXCLUDED.role,
    last_seen_at = EXCLUDED.last_seen_at,
    is_online = true,
    updated_at = EXCLUDED.updated_at
  RETURNING *
  INTO presence_row;

  RETURN presence_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_business_user_presence_offline()
RETURNS public.business_user_presence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  presence_row public.business_user_presence;
  current_user_id uuid := auth.uid();
  is_super_admin_profile boolean := false;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(p.is_super_admin, false) OR p.role = 'super_admin'
  INTO is_super_admin_profile
  FROM public.profiles p
  WHERE p.id = current_user_id;

  IF COALESCE(is_super_admin_profile, false) THEN
    RAISE EXCEPTION 'Super Admin presence is not tracked';
  END IF;

  UPDATE public.business_user_presence
  SET
    is_online = false,
    updated_at = now()
  WHERE user_id = current_user_id
  RETURNING *
  INTO presence_row;

  RETURN presence_row;
END;
$$;

GRANT SELECT ON public.business_user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_business_user_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_business_user_presence_offline() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'business_user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.business_user_presence;
  END IF;
END;
$$;