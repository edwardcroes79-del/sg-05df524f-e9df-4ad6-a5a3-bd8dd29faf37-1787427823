DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' AND column_name = 'includes_premium_templates'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN includes_premium_templates boolean DEFAULT false;
    UPDATE subscription_plans SET includes_premium_templates = false WHERE id IN ('trial', 'starter');
    UPDATE subscription_plans SET includes_premium_templates = true WHERE id IN ('business', 'enterprise');
  END IF;
END $$;