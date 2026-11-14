create table if not exists public.overdue_reminder_settings (
  id boolean primary key default true check (id = true),
  enabled boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamp with time zone not null default now()
);

insert into public.overdue_reminder_settings (id, enabled)
values (true, true)
on conflict (id) do nothing;

create table if not exists public.overdue_reminder_business_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  enabled boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.overdue_reminder_dismissals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_id uuid not null references public.subscription_payments(id) on delete cascade,
  dismissed_on date not null,
  dismissed_by uuid not null references auth.users(id),
  dismissed_at timestamp with time zone not null default now(),
  unique (business_id, invoice_id, dismissed_on)
);

alter table public.overdue_reminder_settings enable row level security;
alter table public.overdue_reminder_business_settings enable row level security;
alter table public.overdue_reminder_dismissals enable row level security;

create policy "super_admin_read_overdue_reminder_settings"
on public.overdue_reminder_settings
for select
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and (profiles.is_super_admin = true or profiles.role = 'super_admin')
));

create policy "super_admin_write_overdue_reminder_settings"
on public.overdue_reminder_settings
for all
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and (profiles.is_super_admin = true or profiles.role = 'super_admin')
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and (profiles.is_super_admin = true or profiles.role = 'super_admin')
));

create policy "super_admin_read_overdue_reminder_business_settings"
on public.overdue_reminder_business_settings
for select
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and (profiles.is_super_admin = true or profiles.role = 'super_admin')
));

create policy "super_admin_write_overdue_reminder_business_settings"
on public.overdue_reminder_business_settings
for all
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and (profiles.is_super_admin = true or profiles.role = 'super_admin')
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and (profiles.is_super_admin = true or profiles.role = 'super_admin')
));

create policy "super_admin_read_overdue_reminder_dismissals"
on public.overdue_reminder_dismissals
for select
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and (profiles.is_super_admin = true or profiles.role = 'super_admin')
));

create policy "super_admin_write_overdue_reminder_dismissals"
on public.overdue_reminder_dismissals
for all
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and (profiles.is_super_admin = true or profiles.role = 'super_admin')
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid()
    and (profiles.is_super_admin = true or profiles.role = 'super_admin')
));