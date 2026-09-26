CREATE TABLE IF NOT EXISTS public.super_admin_notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, source_type, source_id)
);

ALTER TABLE public.super_admin_notification_reads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'super_admin_notification_reads'
      AND policyname = 'super_admin_notification_reads_manage_own'
  ) THEN
    CREATE POLICY "super_admin_notification_reads_manage_own"
    ON public.super_admin_notification_reads
    FOR ALL
    TO authenticated
    USING (
      admin_user_id = auth.uid()
      AND public.is_super_admin_user(auth.uid())
    )
    WITH CHECK (
      admin_user_id = auth.uid()
      AND public.is_super_admin_user(auth.uid())
    );
  END IF;
END $$;