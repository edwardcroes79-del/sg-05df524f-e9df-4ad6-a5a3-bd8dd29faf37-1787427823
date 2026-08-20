-- Drop the existing over-permissive ALL policy
DROP POLICY IF EXISTS authorized_manage_qr_codes ON public.qr_codes;

-- 1. Owner full control (ALL)
CREATE POLICY owner_manage_qr_codes ON public.qr_codes
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = qr_codes.business_id 
        AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = qr_codes.business_id 
        AND businesses.owner_id = auth.uid()
    )
  );

-- 2. Staff read-only access (SELECT)
CREATE POLICY staff_select_qr_codes ON public.qr_codes
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.business_users
      WHERE business_users.business_id = qr_codes.business_id 
        AND business_users.user_id = auth.uid() 
        AND business_users.status = 'active'
    )
  );