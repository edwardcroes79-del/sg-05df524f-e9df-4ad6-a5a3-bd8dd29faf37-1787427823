CREATE TABLE IF NOT EXISTS public.contract_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contract_end_date date NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('30_days', '14_days', '7_days', '1_day', 'expiration')),
  recipient_type text NOT NULL CHECK (recipient_type IN ('business_admin', 'super_admin')),
  recipient_email text NOT NULL,
  email_log_id uuid REFERENCES public.email_logs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, contract_end_date, reminder_type, recipient_type)
);

ALTER TABLE public.contract_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin manage contract reminders" ON public.contract_reminders;
CREATE POLICY "Super admin manage contract reminders"
ON public.contract_reminders
FOR ALL
USING (public.is_super_admin_user(auth.uid()))
WITH CHECK (public.is_super_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_contract_reminders_business_period
ON public.contract_reminders(business_id, contract_end_date);

CREATE INDEX IF NOT EXISTS idx_contract_reminders_status
ON public.contract_reminders(status);