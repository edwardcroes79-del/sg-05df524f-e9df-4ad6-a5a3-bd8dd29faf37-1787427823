DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'protect_business_subscription_entitlements'
      AND tgrelid = 'public.businesses'::regclass
  ) THEN
    CREATE TRIGGER protect_business_subscription_entitlements
    BEFORE UPDATE OF subscription_plan, subscription_status ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_owner_subscription_entitlement_changes();
  END IF;
END $$;

SELECT
  'phase5_security_validation' AS check_name,
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'protect_business_subscription_entitlements'
      AND tgrelid = 'public.businesses'::regclass
  ) AS has_subscription_entitlement_trigger,
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'check_and_increment_rate_limit'
  ) AS has_rate_limit_helper,
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_business_operator'
  ) AS has_business_operator_helper;