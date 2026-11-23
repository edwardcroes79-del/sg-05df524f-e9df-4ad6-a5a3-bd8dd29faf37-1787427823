ALTER TABLE public.super_admin_notification_reads
ADD COLUMN IF NOT EXISTS cleared_at timestamp with time zone NULL;

CREATE INDEX IF NOT EXISTS idx_super_admin_notification_reads_admin_cleared
ON public.super_admin_notification_reads (admin_user_id, cleared_at);