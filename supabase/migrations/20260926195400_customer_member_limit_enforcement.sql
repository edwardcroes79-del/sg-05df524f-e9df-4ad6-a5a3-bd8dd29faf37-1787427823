CREATE OR REPLACE FUNCTION public.enforce_customer_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit numeric;
  v_existing_members integer;
  v_customer_already_linked boolean;
BEGIN
  IF NEW.business_id IS NULL OR NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.customer_loyalty_cards clc
    WHERE clc.business_id = NEW.business_id
      AND clc.customer_id = NEW.customer_id
      AND clc.id IS DISTINCT FROM NEW.id
  )
  INTO v_customer_already_linked;

  IF v_customer_already_linked THEN
    RETURN NEW;
  END IF;

  SELECT public.get_business_numeric_limit(NEW.business_id, 'max_customers', 300)
  INTO v_limit;

  IF v_limit IS NULL OR v_limit >= 999999 THEN
    RETURN NEW;
  END IF;

  SELECT count(DISTINCT clc.customer_id)
  INTO v_existing_members
  FROM public.customer_loyalty_cards clc
  WHERE clc.business_id = NEW.business_id
    AND clc.customer_id IS NOT NULL;

  IF v_existing_members >= v_limit THEN
    RAISE EXCEPTION 'Customer member limit reached for this subscription plan';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_customer_member_limit_trigger ON public.customer_loyalty_cards;

CREATE TRIGGER enforce_customer_member_limit_trigger
BEFORE INSERT ON public.customer_loyalty_cards
FOR EACH ROW
EXECUTE FUNCTION public.enforce_customer_member_limit();