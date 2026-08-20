DROP POLICY IF EXISTS "Allow authenticated insert/update of loyalty assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete of loyalty assets" ON storage.objects;

CREATE POLICY "Business owners can upload loyalty assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'loyalty-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text FROM public.businesses b WHERE b.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update their loyalty assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'loyalty-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text FROM public.businesses b WHERE b.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete their loyalty assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'loyalty-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text FROM public.businesses b WHERE b.owner_id = auth.uid()
  )
);

CREATE POLICY "Super admin can manage all loyalty assets"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'loyalty-assets'
  AND public.is_super_admin_user(auth.uid())
);