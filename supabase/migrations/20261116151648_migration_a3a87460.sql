create table if not exists public.setup_assistance_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint setup_assistance_requests_status_check
    check (status in ('pending', 'accepted', 'declined', 'completed'))
);

create index if not exists idx_setup_assistance_requests_business_requested
  on public.setup_assistance_requests (business_id, requested_at desc);

create index if not exists idx_setup_assistance_requests_status_requested
  on public.setup_assistance_requests (status, requested_at desc);

create unique index if not exists idx_setup_assistance_requests_active_unique
  on public.setup_assistance_requests (business_id)
  where status in ('pending', 'accepted');

alter table public.setup_assistance_requests enable row level security;

drop policy if exists business_admin_read_own_setup_assistance_requests on public.setup_assistance_requests;
create policy business_admin_read_own_setup_assistance_requests
on public.setup_assistance_requests
for select
using (
  exists (
    select 1
    from public.businesses b
    where b.id = setup_assistance_requests.business_id
      and b.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.business_users bu
    where bu.business_id = setup_assistance_requests.business_id
      and bu.user_id = auth.uid()
      and bu.status = 'active'
      and bu.role in ('owner', 'admin', 'corporate_admin')
  )
);

drop policy if exists business_admin_create_own_setup_assistance_requests on public.setup_assistance_requests;
create policy business_admin_create_own_setup_assistance_requests
on public.setup_assistance_requests
for insert
with check (
  requested_by = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and exists (
    select 1
    from public.businesses b
    where b.id = setup_assistance_requests.business_id
      and b.owner_id = auth.uid()
  )
  or (
    requested_by = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1
      from public.business_users bu
      where bu.business_id = setup_assistance_requests.business_id
        and bu.user_id = auth.uid()
        and bu.status = 'active'
        and bu.role in ('owner', 'admin', 'corporate_admin')
    )
  )
);

drop policy if exists super_admin_read_setup_assistance_requests on public.setup_assistance_requests;
create policy super_admin_read_setup_assistance_requests
on public.setup_assistance_requests
for select
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (profiles.is_super_admin = true or profiles.role = 'super_admin')
  )
);

drop policy if exists super_admin_manage_setup_assistance_requests on public.setup_assistance_requests;
create policy super_admin_manage_setup_assistance_requests
on public.setup_assistance_requests
for all
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (profiles.is_super_admin = true or profiles.role = 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and (profiles.is_super_admin = true or profiles.role = 'super_admin')
  )
);