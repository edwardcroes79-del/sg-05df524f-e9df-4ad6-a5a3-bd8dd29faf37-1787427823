DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Super admins view payment proofs'
  ) THEN
    ALTER POLICY "Super admins view payment proofs"
    ON storage.objects
    USING (
      bucket_id = 'payment-proofs'
      AND public.is_super_admin_user(auth.uid())
    );
  ELSE
    CREATE POLICY "Super admins view payment proofs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'payment-proofs'
      AND public.is_super_admin_user(auth.uid())
    );
  END IF;
END $$;

SELECT
  'payment_proofs_bucket_exists_private' AS check_name,
  EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'payment-proofs'
      AND name = 'payment-proofs'
      AND public = false
      AND file_size_limit = 5242880
      AND allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
  ) AS passed
UNION ALL
SELECT
  'business_owner_upload_policy_exists',
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Business owners insert own payment proofs'
      AND cmd = 'INSERT'
      AND with_check LIKE '%payment-proofs%'
      AND with_check LIKE '%businesses%'
      AND with_check LIKE '%owner_id%'
  )
UNION ALL
SELECT
  'business_owner_view_policy_exists',
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Business owners view own payment proofs'
      AND cmd = 'SELECT'
      AND qual LIKE '%payment-proofs%'
      AND qual LIKE '%businesses%'
      AND qual LIKE '%owner_id%'
  )
UNION ALL
SELECT
  'business_owner_update_policy_exists',
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Business owners update own payment proofs'
      AND cmd = 'UPDATE'
      AND qual LIKE '%payment-proofs%'
      AND qual LIKE '%businesses%'
      AND qual LIKE '%owner_id%'
  )
UNION ALL
SELECT
  'super_admin_view_policy_exists',
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Super admins view payment proofs'
      AND cmd = 'SELECT'
      AND qual LIKE '%payment-proofs%'
      AND qual LIKE '%is_super_admin_user%'
  );