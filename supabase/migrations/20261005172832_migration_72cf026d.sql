create table if not exists public.restore_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  restore_mode text not null default 'dry_run' check (restore_mode in ('dry_run', 'restore')),
  backup_id text null,
  backup_version text null,
  safety_backup_job_id uuid null references public.backup_jobs(id) on delete set null,
  performed_by uuid null references auth.users(id) on delete set null,
  manifest jsonb null,
  report jsonb null,
  error_message text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.restore_jobs enable row level security;

drop policy if exists restore_jobs_super_admin_select on public.restore_jobs;
drop policy if exists restore_jobs_super_admin_insert on public.restore_jobs;
drop policy if exists restore_jobs_super_admin_update on public.restore_jobs;

create policy restore_jobs_super_admin_select
on public.restore_jobs
for select
using (is_super_admin_user(auth.uid()));

create policy restore_jobs_super_admin_insert
on public.restore_jobs
for insert
with check (is_super_admin_user(auth.uid()));

create policy restore_jobs_super_admin_update
on public.restore_jobs
for update
using (is_super_admin_user(auth.uid()))
with check (is_super_admin_user(auth.uid()));

create unique index if not exists restore_jobs_single_running_idx
on public.restore_jobs ((status))
where status = 'running';

create index if not exists restore_jobs_created_at_idx
on public.restore_jobs (created_at desc);