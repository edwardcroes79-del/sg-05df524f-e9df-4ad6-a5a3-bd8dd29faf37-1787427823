CREATE OR REPLACE FUNCTION public.validate_customer_loyalty_card_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_customer_user_id uuid;
  v_program_business_id uuid;
BEGIN
  SELECT user_id INTO v_customer_user_id
  FROM public.customers
  WHERE id = NEW.customer_id;

  IF v_customer_user_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  SELECT business_id INTO v_program_business_id
  FROM public.loyalty_programs
  WHERE id = NEW.loyalty_program_id
    AND active = true;

  IF v_program_business_id IS NULL THEN
    RAISE EXCEPTION 'Active loyalty program not found';
  END IF;

  IF NEW.business_id IS DISTINCT FROM v_program_business_id THEN
    RAISE EXCEPTION 'Loyalty program does not belong to this business';
  END IF;

  NEW.user_id := v_customer_user_id;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'validate_customer_loyalty_card_consistency_before_write'
      AND tgrelid = 'public.customer_loyalty_cards'::regclass
  ) THEN
    CREATE TRIGGER validate_customer_loyalty_card_consistency_before_write
    BEFORE INSERT OR UPDATE OF customer_id, business_id, loyalty_program_id
    ON public.customer_loyalty_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_customer_loyalty_card_consistency();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_loyalty_program_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_plan_id text;
  v_max_programs integer;
  v_existing_count integer;
BEGIN
  SELECT COALESCE(b.subscription_plan, 'starter')
  INTO v_plan_id
  FROM public.businesses b
  WHERE b.id = NEW.business_id;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  SELECT COALESCE(sp.max_loyalty_programs, 1)
  INTO v_max_programs
  FROM public.subscription_plans sp
  WHERE sp.id = v_plan_id;

  SELECT count(*)
  INTO v_existing_count
  FROM public.loyalty_programs lp
  WHERE lp.business_id = NEW.business_id;

  IF v_existing_count >= COALESCE(v_max_programs, 1) THEN
    RAISE EXCEPTION 'Loyalty program limit reached for current subscription plan';
  END IF;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'enforce_loyalty_program_limit_before_insert'
      AND tgrelid = 'public.loyalty_programs'::regclass
  ) THEN
    CREATE TRIGGER enforce_loyalty_program_limit_before_insert
    BEFORE INSERT
    ON public.loyalty_programs
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_loyalty_program_limit();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customer_loyalty_cards_user_id ON public.customer_loyalty_cards(user_id);