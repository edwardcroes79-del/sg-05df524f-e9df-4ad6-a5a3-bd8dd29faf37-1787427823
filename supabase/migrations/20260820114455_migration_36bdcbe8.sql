DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop old restrictive business owner policies
    FOR r IN (
        SELECT polname FROM pg_policy 
        WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = 'objects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage'))
        AND polname ILIKE '%loyalty assets%'
        AND polname != 'Allow public select of loyalty assets'
        AND polname != 'Super admin can manage all loyalty assets'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.polname);
    END LOOP;
END
$$;

-- Create comprehensive policies allowing owners AND active staff to manage isolated business assets
CREATE POLICY "Business operators can upload loyalty assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'loyalty-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_id = auth.uid()
    UNION
    SELECT business_id::text FROM public.business_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Business operators can update loyalty assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'loyalty-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_id = auth.uid()
    UNION
    SELECT business_id::text FROM public.business_users WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Business operators can delete loyalty assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'loyalty-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_id = auth.uid()
    UNION
    SELECT business_id::text FROM public.business_users WHERE user_id = auth.uid() AND status = 'active'
  )
);