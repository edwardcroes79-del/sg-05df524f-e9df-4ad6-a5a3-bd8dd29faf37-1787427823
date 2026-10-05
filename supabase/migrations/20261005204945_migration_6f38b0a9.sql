alter table public.backup_jobs
  add column if not exists heartbeat_at timestamp with time zone not null default now(),
  add column if not exists cancellation_requested_at timestamp with time zone null,
  add column if not exists cancelled_at timestamp with time zone null,
  add column if not exists cleanup_completed_at timestamp with time zone null;

alter table public.backup_jobs
  drop constraint if exists backup_jobs_status_check;

alter table public.backup_jobs
  add constraint backup_jobs_status_check
  check (status in ('running', 'completed', 'failed', 'cancelled', 'abandoned'));

create index if not exists backup_jobs_heartbeat_idx
  on public.backup_jobs (status, heartbeat_at);

select
  id,
  status,
  backup_version,
  started_at,
  heartbeat_at,
  updated_at,
  completed_at,
  error_message,
  package_path,
  package_size_bytes,
  created_by
from public.backup_jobs
where status = 'running'
order by started_at desc nulls last, created_at desc
limit 10;

select
  status,
  count(*) as count,
  min(started_at) as oldest_started_at,
  max(started_at) as newest_started_at
from public.backup_jobs
group by status
order by status;