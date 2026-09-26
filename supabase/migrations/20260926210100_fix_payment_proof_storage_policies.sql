INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[];

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Business owners insert own payment proofs'
  ) THEN
    ALTER POLICY "Business owners insert own payment proofs"
    ON storage.objects
    WITH CHECK (
      bucket_id = 'payment-proofs'
      AND EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.owner_id = auth.uid()
      )
    );
  ELSE
    CREATE POLICY "Business owners insert own payment proofs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'payment-proofs'
      AND EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.owner_id = auth.uid()
      )
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Business owners view own payment proofs'
  ) THEN
    ALTER POLICY "Business owners view own payment proofs"
    ON storage.objects
    USING (
      bucket_id = 'payment-proofs'
      AND EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.owner_id = auth.uid()
      )
    );
  ELSE
    CREATE POLICY "Business owners view own payment proofs"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'payment-proofs'
      AND EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.owner_id = auth.uid()
      )
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Business owners update own payment proofs'
  ) THEN
    ALTER POLICY "Business owners update own payment proofs"
    ON storage.objects
    USING (
      bucket_id = 'payment-proofs'
      AND EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'payment-proofs'
      AND EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.owner_id = auth.uid()
      )
    );
  ELSE
    CREATE POLICY "Business owners update own payment proofs"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'payment-proofs'
      AND EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'payment-proofs'
      AND EXISTS (
        SELECT 1
        FROM public.businesses b
        WHERE b.id::text = (storage.foldername(name))[1]
          AND b.owner_id = auth.uid()
      )
    );
  END IF;

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