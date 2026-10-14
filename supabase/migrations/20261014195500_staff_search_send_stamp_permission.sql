ALTER TABLE public.business_users
ADD COLUMN IF NOT EXISTS allow_search_send_stamp boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_business_users_search_send_permission
ON public.business_users (business_id, user_id, allow_search_send_stamp)
WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.user_can_search_send_stamp(p_user_id uuid, p_business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.owner_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = p_business_id
      AND bu.user_id = p_user_id
      AND bu.status = 'active'
      AND bu.allow_search_send_stamp = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.search_business_customers(p_business_id uuid, p_search text DEFAULT ''::text, p_limit integer DEFAULT 25)
RETURNS TABLE(id uuid, name text, email text, phone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  normalized_search text := COALESCE(NULLIF(TRIM(p_search), ''), '');
  normalized_phone_search text := regexp_replace(COALESCE(NULLIF(TRIM(p_search), ''), ''), '\D', '', 'g');
BEGIN
  IF p_business_id IS NULL OR NOT public.can_access_business(p_business_id::uuid) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF NOT public.user_can_search_send_stamp(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'Search & Send Stamp is not enabled for this staff account';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (c.id)
    c.id,
    c.name,
    c.email,
    c.phone
  FROM public.customer_loyalty_cards clc
  INNER JOIN public.customers c ON c.id = clc.customer_id
  WHERE clc.business_id = p_business_id
    AND (
      normalized_search = ''
      OR c.name ILIKE ('%' || normalized_search || '%')
      OR COALESCE(c.email, '') ILIKE ('%' || normalized_search || '%')
      OR COALESCE(c.phone, '') ILIKE ('%' || normalized_search || '%')
      OR (
        normalized_phone_search <> ''
        AND regexp_replace(COALESCE(c.phone, ''), '\D', '', 'g') ILIKE ('%' || normalized_phone_search || '%')
      )
    )
  ORDER BY c.id, c.name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 50);
END;
$function$;