ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "owner_read_qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "public_read_qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "owner_insert_qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "owner_update_qr_codes" ON public.qr_codes;
DROP POLICY IF EXISTS "owner_delete_qr_codes" ON public.qr_codes;

-- Owner read
CREATE POLICY "owner_read_qr_codes" ON public.qr_codes 
FOR SELECT USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Public read for active QR codes (so customers can scan them)
CREATE POLICY "public_read_qr_codes" ON public.qr_codes 
FOR SELECT USING (active = true);

-- Owner insert
CREATE POLICY "owner_insert_qr_codes" ON public.qr_codes 
FOR INSERT WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Owner update
CREATE POLICY "owner_update_qr_codes" ON public.qr_codes 
FOR UPDATE USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Owner delete
CREATE POLICY "owner_delete_qr_codes" ON public.qr_codes 
FOR DELETE USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);