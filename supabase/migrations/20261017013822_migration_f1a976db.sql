BEGIN;

CREATE OR REPLACE FUNCTION public.check_business_phone_on_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.phone IS NULL OR trim(NEW.phone) = '' THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;
  IF NEW.phone !~ '^\+?[0-9\s\-()]{6,20}$' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_check_business_phone_on_insert ON public.businesses;
CREATE TRIGGER tr_check_business_phone_on_insert
BEFORE INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.check_business_phone_on_insert();

COMMIT;