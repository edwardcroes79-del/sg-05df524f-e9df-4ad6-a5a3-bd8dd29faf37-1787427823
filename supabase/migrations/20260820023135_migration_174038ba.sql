CREATE OR REPLACE FUNCTION public.prevent_owner_subscription_entitlement_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin_user(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.trial_start IS DISTINCT FROM OLD.trial_start
    OR NEW.trial_end IS DISTINCT FROM OLD.trial_end
  ) THEN
    RAISE EXCEPTION 'Subscription entitlements can only be changed by authorized admin workflows';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_owner_subscription_entitlement_changes ON public.businesses;

CREATE TRIGGER prevent_owner_subscription_entitlement_changes
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.prevent_owner_subscription_entitlement_changes();

CREATE INDEX IF NOT EXISTS idx_businesses_subscription_plan ON public.businesses(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_business_users_business_status ON public.business_users(business_id, status);