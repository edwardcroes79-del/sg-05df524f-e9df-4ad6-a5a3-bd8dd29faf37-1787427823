CREATE OR REPLACE FUNCTION check_premium_template_entitlement()
RETURNS trigger AS $$
DECLARE
  v_subscription_plan text;
  v_includes_premium boolean;
BEGIN
  -- Only check if template_id is changing and is a premium template
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.template_id IS DISTINCT FROM OLD.template_id) THEN
    
    -- Check if the new template is premium
    IF NEW.template_id NOT IN ('classic', 'modern', 'minimal') THEN
      
      -- Get the business's subscription plan
      SELECT b.subscription_plan INTO v_subscription_plan
      FROM businesses b
      WHERE b.id = NEW.business_id;

      -- Check plan entitlement
      SELECT includes_premium_templates INTO v_includes_premium
      FROM subscription_plans
      WHERE id = v_subscription_plan;

      IF v_includes_premium IS NOT TRUE THEN
        RAISE EXCEPTION 'Rejected: Premium templates are only available on Business or Enterprise plans.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_premium_template_trigger ON loyalty_programs;
CREATE TRIGGER enforce_premium_template_trigger
BEFORE INSERT OR UPDATE ON loyalty_programs
FOR EACH ROW EXECUTE FUNCTION check_premium_template_entitlement();