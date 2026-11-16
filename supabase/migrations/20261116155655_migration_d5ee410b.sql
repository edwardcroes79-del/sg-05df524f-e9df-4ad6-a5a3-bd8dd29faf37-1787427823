alter table public.setup_assistance_requests
  drop constraint if exists setup_assistance_requests_status_check;

alter table public.setup_assistance_requests
  add constraint setup_assistance_requests_status_check
  check (status in ('pending', 'accepted', 'ready_for_review', 'declined', 'completed'));

drop index if exists public.idx_setup_assistance_requests_active_unique;

create unique index idx_setup_assistance_requests_active_unique
  on public.setup_assistance_requests (business_id)
  where status in ('pending', 'accepted', 'ready_for_review');

create table if not exists public.setup_sessions (
  id uuid primary key default gen_random_uuid(),
  setup_request_id uuid not null references public.setup_assistance_requests(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  superadmin_user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '45 minutes'),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint setup_sessions_expiry_window check (expires_at > started_at and expires_at <= started_at + interval '45 minutes'),
  constraint setup_sessions_revoke_reason_length check (revoke_reason is null or char_length(revoke_reason) <= 120)
);

create index if not exists idx_setup_sessions_request_active
  on public.setup_sessions (setup_request_id, revoked_at, expires_at desc);

create index if not exists idx_setup_sessions_business_started
  on public.setup_sessions (business_id, started_at desc);

alter table public.setup_sessions enable row level security;

create policy setup_sessions_super_admin_read
  on public.setup_sessions
  for select
  using (public.is_super_admin_user(auth.uid()));

create table if not exists public.setup_drafts (
  id uuid primary key default gen_random_uuid(),
  setup_request_id uuid not null unique references public.setup_assistance_requests(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  target_program_id uuid references public.loyalty_programs(id) on delete set null,
  branding jsonb not null default '{}'::jsonb,
  program jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_setup_drafts_business
  on public.setup_drafts (business_id, updated_at desc);

alter table public.setup_drafts enable row level security;

create policy setup_drafts_super_admin_read
  on public.setup_drafts
  for select
  using (public.is_super_admin_user(auth.uid()));