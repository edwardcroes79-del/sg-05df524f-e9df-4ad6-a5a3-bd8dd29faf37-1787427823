CREATE OR REPLACE FUNCTION public.search_business_customers(
  p_business_id uuid,
  p_search text DEFAULT '',
  p_limit integer DEFAULT 25,
  p_loyalty_program_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, name text, email text, phone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_loyalty_program_id IS NULL THEN
    RAISE EXCEPTION 'A loyalty program is required for customer search.';
  END IF;

  IF NOT public.user_can_search_send_stamp(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'Search & Send Stamp is not enabled for this staff account' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    c.id,
    c.name,
    c.email,
    c.phone
  FROM public.customer_loyalty_cards clc
  JOIN public.customers c ON c.id = clc.customer_id
  WHERE clc.business_id = p_business_id
    AND clc.loyalty_program_id = p_loyalty_program_id
    AND clc.status = 'active'
    AND (
      COALESCE(p_search, '') = ''
      OR c.name ILIKE '%' || p_search || '%'
      OR c.email ILIKE '%' || p_search || '%'
      OR c.phone ILIKE '%' || p_search || '%'
    )
  ORDER BY c.name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 50);
END;
$function$;