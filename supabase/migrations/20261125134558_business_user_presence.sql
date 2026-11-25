CREATE TABLE public.business_user_presence (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT true,
  signed_out_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_user_presence_business_online_seen
  ON public.business_user_presence (business_id, is_online, last_seen_at DESC);

CREATE INDEX idx_business_user_presence_last_seen
  ON public.business_user_presence (last_seen_at DESC);

ALTER TABLE public.business_user_presence ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_business_presence_eligible_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_super_admin_profile boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND (is_super_admin = true OR role = 'super_admin')
  )
  INTO has_super_admin_profile;

  IF has_super_admin_profile THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE owner_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.business_users
    WHERE user_id = p_user_id
      AND status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_business_presence_business_id(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_business_id uuid;
BEGIN
  IF NOT public.is_business_presence_eligible_user(p_user_id) THEN
    RETURN NULL;
  END IF;

  SELECT businesses.id
  INTO resolved_business_id
  FROM public.businesses
  WHERE businesses.owner_id = p_user_id
  ORDER BY businesses.created_at ASC
  LIMIT 1;

  IF resolved_business_id IS NOT NULL THEN
    RETURN resolved_business_id;
  END IF;

  SELECT business_users.business_id
  INTO resolved_business_id
  FROM public.business_users
  WHERE business_users.user_id = p_user_id
    AND business_users.status = 'active'
  ORDER BY business_users.created_at ASC
  LIMIT 1;

  RETURN resolved_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_business_user_presence()
RETURNS TABLE (
  user_id uuid,
  business_id uuid,
  last_seen_at timestamp with time zone,
  is_online boolean,
  signed_out_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  resolved_business_id uuid;
  heartbeat_at timestamp with time zone;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  heartbeat_at := now();
  resolved_business_id := public.resolve_business_presence_business_id(current_user_id);

  IF resolved_business_id IS NULL THEN
    DELETE FROM public.business_user_presence
    WHERE business_user_presence.user_id = current_user_id;
    RETURN;
  END IF;

  INSERT INTO public.business_user_presence (
    user_id,
    business_id,
    last_seen_at,
    is_online,
    signed_out_at,
    created_at,
    updated_at
  )
  VALUES (
    current_user_id,
    resolved_business_id,
    heartbeat_at,
    true,
    NULL,
    heartbeat_at,
    heartbeat_at
  )
  ON CONFLICT (user_id) DO UPDATE
  SET business_id = EXCLUDED.business_id,
      last_seen_at = EXCLUDED.last_seen_at,
      is_online = true,
      signed_out_at = NULL,
      updated_at = EXCLUDED.updated_at;

  RETURN QUERY
  SELECT
    business_user_presence.user_id,
    business_user_presence.business_id,
    business_user_presence.last_seen_at,
    business_user_presence.is_online,
    business_user_presence.signed_out_at,
    business_user_presence.updated_at
  FROM public.business_user_presence
  WHERE business_user_presence.user_id = current_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_business_user_presence_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  signed_out_at_value timestamp with time zone;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  signed_out_at_value := now();

  UPDATE public.business_user_presence
  SET is_online = false,
      signed_out_at = signed_out_at_value,
      updated_at = signed_out_at_value
  WHERE business_user_presence.user_id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_business_presence_eligible_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_business_presence_business_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_business_user_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_business_user_presence_offline() TO authenticated;

CREATE POLICY business_user_presence_select_own
ON public.business_user_presence
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY business_user_presence_select_super_admin
ON public.business_user_presence
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.is_super_admin = true OR profiles.role = 'super_admin')
  )
);

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