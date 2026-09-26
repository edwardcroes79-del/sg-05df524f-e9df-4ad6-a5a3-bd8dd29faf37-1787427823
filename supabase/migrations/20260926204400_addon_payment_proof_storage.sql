INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']::text[],
  updated_at = now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Business owners can upload own payment proofs'
  ) THEN
    CREATE POLICY "Business owners can upload own payment proofs"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'payment-proofs'
      AND (storage.foldername(name))[1] IN (
        SELECT businesses.id::text
        FROM public.businesses
        WHERE businesses.owner_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Business owners can view own payment proofs'
  ) THEN
    CREATE POLICY "Business owners can view own payment proofs"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'payment-proofs'
      AND (storage.foldername(name))[1] IN (
        SELECT businesses.id::text
        FROM public.businesses
        WHERE businesses.owner_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Business owners can replace own payment proofs'
  ) THEN
    CREATE POLICY "Business owners can replace own payment proofs"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'payment-proofs'
      AND (storage.foldername(name))[1] IN (
        SELECT businesses.id::text
        FROM public.businesses
        WHERE businesses.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'payment-proofs'
      AND (storage.foldername(name))[1] IN (
        SELECT businesses.id::text
        FROM public.businesses
        WHERE businesses.owner_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Super admin can view payment proofs'
  ) THEN
    CREATE POLICY "Super admin can view payment proofs"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'payment-proofs'
      AND public.is_super_admin_user(auth.uid())
    );
  END IF;
END $$;