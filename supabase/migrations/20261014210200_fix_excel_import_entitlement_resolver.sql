CREATE OR REPLACE FUNCTION public.get_business_boolean_entitlement(
  p_business_id uuid,
  p_key text,
  p_fallback boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  resolved_value boolean;
BEGIN
  IF p_business_id IS NULL OR p_key IS NULL THEN
    RETURN p_fallback;
  END IF;

  SELECT COALESCE(pe.boolean_value, p_fallback)
  INTO resolved_value
  FROM public.businesses b
  LEFT JOIN public.plan_entitlements pe
    ON pe.plan_id = b.subscription_plan
   AND pe.key = p_key
   AND pe.value_type = 'boolean'
  WHERE b.id = p_business_id
    AND COALESCE(b.status, 'active') = 'active'
    AND COALESCE(b.subscription_status, 'active') = 'active'
    AND COALESCE(b.contract_status, 'active') NOT IN ('expired', 'cancelled', 'inactive');

  RETURN COALESCE(resolved_value, p_fallback);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_business_boolean_entitlement(uuid, text, boolean) TO authenticated;