create table if not exists public.manual_payment_reminders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subscription_payment_id uuid null references public.subscription_payments(id) on delete set null,
  recipient_user_id uuid null references auth.users(id) on delete set null,
  message text not null,
  sent_by uuid not null references auth.users(id),
  sent_at timestamptz not null default now(),
  displayed_at timestamptz null,
  dismissed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  constraint manual_payment_reminders_message_length check (char_length(btrim(message)) between 20 and 2000)
);

alter table public.manual_payment_reminders enable row level security;

create index if not exists idx_manual_payment_reminders_business_sent
  on public.manual_payment_reminders (business_id, sent_at desc);

create index if not exists idx_manual_payment_reminders_recipient_pending
  on public.manual_payment_reminders (recipient_user_id, dismissed_at, sent_at desc);

drop policy if exists super_admin_read_manual_payment_reminders on public.manual_payment_reminders;
drop policy if exists super_admin_write_manual_payment_reminders on public.manual_payment_reminders;
drop policy if exists business_admin_read_own_manual_payment_reminders on public.manual_payment_reminders;
drop policy if exists business_admin_update_own_manual_payment_reminders on public.manual_payment_reminders;

create policy super_admin_read_manual_payment_reminders
on public.manual_payment_reminders
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and (profiles.is_super_admin = true or profiles.role = 'super_admin')
  )
);

create policy super_admin_write_manual_payment_reminders
on public.manual_payment_reminders
for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and (profiles.is_super_admin = true or profiles.role = 'super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and (profiles.is_super_admin = true or profiles.role = 'super_admin')
  )
);

create policy business_admin_read_own_manual_payment_reminders
on public.manual_payment_reminders
for select
using (
  dismissed_at is null
  and (
    recipient_user_id = auth.uid()
    or exists (
      select 1 from public.businesses b
      where b.id = manual_payment_reminders.business_id
        and b.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.business_users bu
      where bu.business_id = manual_payment_reminders.business_id
        and bu.user_id = auth.uid()
        and bu.status = 'active'
        and bu.role in ('owner', 'admin', 'corporate_admin')
    )
  )
);

create policy business_admin_update_own_manual_payment_reminders
on public.manual_payment_reminders
for update
using (
  dismissed_at is null
  and (
    recipient_user_id = auth.uid()
    or exists (
      select 1 from public.businesses b
      where b.id = manual_payment_reminders.business_id
        and b.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.business_users bu
      where bu.business_id = manual_payment_reminders.business_id
        and bu.user_id = auth.uid()
        and bu.status = 'active'
        and bu.role in ('owner', 'admin', 'corporate_admin')
    )
  )
)
with check (
  (
    recipient_user_id = auth.uid()
    or exists (
      select 1 from public.businesses b
      where b.id = manual_payment_reminders.business_id
        and b.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.business_users bu
      where bu.business_id = manual_payment_reminders.business_id
        and bu.user_id = auth.uid()
        and bu.status = 'active'
        and bu.role in ('owner', 'admin', 'corporate_admin')
    )
  )
);