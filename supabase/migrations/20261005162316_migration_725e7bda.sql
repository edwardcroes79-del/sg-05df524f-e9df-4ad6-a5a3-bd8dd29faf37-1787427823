create table if not exists public.backup_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  backup_version text not null default '2026-10-05.phase2',
  package_path text,
  package_sha256 text,
  package_size_bytes bigint,
  manifest jsonb,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.backup_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'backup_jobs'
      and policyname = 'backup_jobs_super_admin_select'
  ) then
    create policy backup_jobs_super_admin_select
      on public.backup_jobs
      for select
      using (is_super_admin_user(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'backup_jobs'
      and policyname = 'backup_jobs_super_admin_insert'
  ) then
    create policy backup_jobs_super_admin_insert
      on public.backup_jobs
      for insert
      with check (is_super_admin_user(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'backup_jobs'
      and policyname = 'backup_jobs_super_admin_update'
  ) then
    create policy backup_jobs_super_admin_update
      on public.backup_jobs
      for update
      using (is_super_admin_user(auth.uid()))
      with check (is_super_admin_user(auth.uid()));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'system-backups',
  'system-backups',
  false,
  1073741824,
  array['application/gzip', 'application/x-gzip', 'application/octet-stream']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;