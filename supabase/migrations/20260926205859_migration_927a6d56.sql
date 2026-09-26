INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[],
  updated_at = now();

DROP POLICY IF EXISTS "Business owners upload own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Business owners view own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Business owners update own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Super admins view payment proofs" ON storage.objects;

CREATE POLICY "Business owners upload own payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Business owners view own payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Business owners update own payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.owner_id = auth.uid()
      AND b.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Super admins view payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.current_user_is_super_admin()
);

SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'payment-proofs';

SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname IN (
    'Business owners upload own payment proofs',
    'Business owners view own payment proofs',
    'Business owners update own payment proofs',
    'Super admins view payment proofs'
  )
ORDER BY policyname;