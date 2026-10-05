create unique index if not exists backup_jobs_single_running_idx
on public.backup_jobs ((status))
where status = 'running';

create index if not exists backup_jobs_completed_retention_idx
on public.backup_jobs (completed_at desc)
where status = 'completed';