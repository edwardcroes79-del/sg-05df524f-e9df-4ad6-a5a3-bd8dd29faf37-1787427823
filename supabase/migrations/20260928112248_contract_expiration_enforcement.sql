CREATE OR REPLACE FUNCTION public.refresh_expired_business_contracts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.businesses
  SET
    contract_status = 'expired',
    updated_at = now()
  WHERE contract_end_date IS NOT NULL
    AND contract_end_date <= CURRENT_DATE
    AND COALESCE(contract_status, 'active') <> 'expired';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_business_contract_accessible(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND (
        b.contract_end_date IS NULL
        OR (
          COALESCE(b.contract_status, 'active') <> 'expired'
          AND b.contract_end_date > CURRENT_DATE
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_business(p_business_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin_user(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = p_business_id
        AND b.owner_id = p_user_id
        AND public.is_business_contract_accessible(b.id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_users bu
      WHERE bu.business_id = p_business_id
        AND bu.user_id = p_user_id
        AND bu.status = 'active'
        AND public.is_business_contract_accessible(bu.business_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.check_business_ownership(b_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = b_id
      AND b.owner_id = u_id
      AND public.is_business_contract_accessible(b.id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_business_dashboard_access_status(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  business_name text,
  status text,
  subscription_plan text,
  trial_end timestamp with time zone,
  contract_end_date date,
  contract_status text,
  access_state text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.refresh_expired_business_contracts();

  RETURN QUERY
  WITH matched_businesses AS (
    SELECT
      b.id,
      b.owner_id,
      b.business_name,
      b.status,
      b.subscription_plan,
      b.trial_end,
      b.contract_end_date,
      b.contract_status,
      0 AS sort_order
    FROM public.businesses b
    WHERE b.owner_id = p_user_id

    UNION ALL

    SELECT
      b.id,
      b.owner_id,
      b.business_name,
      b.status,
      b.subscription_plan,
      b.trial_end,
      b.contract_end_date,
      b.contract_status,
      1 AS sort_order
    FROM public.business_users bu
    JOIN public.businesses b ON b.id = bu.business_id
    WHERE bu.user_id = p_user_id
      AND bu.status = 'active'
  )
  SELECT
    mb.id,
    mb.owner_id,
    mb.business_name::text,
    mb.status::text,
    mb.subscription_plan::text,
    mb.trial_end,
    mb.contract_end_date,
    mb.contract_status::text,
    CASE
      WHEN mb.contract_end_date IS NOT NULL
        AND (
          COALESCE(mb.contract_status, 'active') = 'expired'
          OR mb.contract_end_date <= CURRENT_DATE
        )
      THEN 'contract_expired'
      ELSE 'allowed'
    END AS access_state
  FROM matched_businesses mb
  ORDER BY mb.sort_order
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_expired_business_contracts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_contract_accessible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_business(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_business_ownership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_dashboard_access_status(uuid) TO authenticated;