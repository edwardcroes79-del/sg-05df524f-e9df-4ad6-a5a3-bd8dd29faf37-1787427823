-- Safely drop old policies
DROP POLICY IF EXISTS "owner_insert_qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "owner_read_qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "owner_update_qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "owner_delete_qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "authorized_manage_qr_codes" ON public.qr_codes;

-- Create comprehensive policy for Business Owners and Active Staff
CREATE POLICY "authorized_manage_qr_codes" ON public.qr_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = qr_codes.business_id AND owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.business_users 
    WHERE business_id = qr_codes.business_id AND user_id = auth.uid() AND status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = qr_codes.business_id AND owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.business_users 
    WHERE business_id = qr_codes.business_id AND user_id = auth.uid() AND status = 'active'
  )
);