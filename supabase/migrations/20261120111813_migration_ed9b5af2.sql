create table if not exists public.account_holds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  hold_type text not null check (hold_type in ('manual', 'automatic')),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  internal_note text check (internal_note is null or char_length(internal_note) <= 2000),
  placed_by uuid references auth.users(id) on delete set null,
  placed_at timestamptz not null default now(),
  due_date date,
  previous_status text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution text check (resolution is null or resolution in ('payment_approved', 'lifted_by_superadmin')),
  restoration_payment_id uuid references public.subscription_payments(id) on delete set null,
  new_renewal_date date,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_account_holds_one_open
  on public.account_holds (business_id) where resolved_at is null;
create index if not exists idx_account_holds_business_placed
  on public.account_holds (business_id, placed_at desc);

alter table public.account_holds enable row level security;

drop policy if exists "super_admin_read_account_holds" on public.account_holds;
create policy "super_admin_read_account_holds" on public.account_holds
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin = true)
  );

create or replace function public.guard_business_hold_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_super boolean := false;
begin
  if coalesce(old.status, '') = coalesce(new.status, '') then
    return new;
  end if;

  if coalesce(old.status, '') <> 'on_hold' and coalesce(new.status, '') <> 'on_hold' then
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  select coalesce(p.is_super_admin, false) into v_is_super
  from public.profiles p
  where p.id = auth.uid();

  if not coalesce(v_is_super, false) then
    raise exception 'ACCOUNT_HOLD_STATUS_PROTECTED' using errcode = '42501';
  end if;

  if coalesce(old.status, '') = 'on_hold' then
    update public.account_holds
    set resolved_at = now(), resolved_by = auth.uid(), resolution = 'lifted_by_superadmin'
    where business_id = new.id and resolved_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_business_hold_status on public.businesses;
create trigger trg_guard_business_hold_status
  before update of status on public.businesses
  for each row execute function public.guard_business_hold_status();

create or replace function public.place_account_on_hold(p_business_id uuid, p_reason text, p_internal_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_note text := nullif(btrim(coalesce(p_internal_note, '')), '');
  v_hold_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin = true
  ) then
    raise exception 'ACCOUNT_HOLD_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    raise exception 'ACCOUNT_HOLD_REASON_INVALID' using errcode = 'P0001';
  end if;

  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'ACCOUNT_HOLD_NOTE_INVALID' using errcode = 'P0001';
  end if;

  select * into v_business from public.businesses where id = p_business_id for update;
  if not found then
    raise exception 'ACCOUNT_HOLD_BUSINESS_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_business.status = 'on_hold' then
    raise exception 'ACCOUNT_ALREADY_ON_HOLD' using errcode = 'P0001';
  end if;

  if v_business.status = 'pending' then
    raise exception 'ACCOUNT_HOLD_BUSINESS_NOT_APPROVED' using errcode = 'P0001';
  end if;

  insert into public.account_holds (business_id, hold_type, reason, internal_note, placed_by, previous_status)
  values (p_business_id, 'manual', v_reason, v_note, auth.uid(), v_business.status)
  returning id into v_hold_id;

  update public.businesses set status = 'on_hold' where id = p_business_id;

  insert into public.audit_logs (action, target_type, target_id, metadata)
  values ('account_hold.placed', 'business', p_business_id, jsonb_build_object(
    'hold_id', v_hold_id,
    'hold_type', 'manual',
    'reason', v_reason,
    'placed_by', auth.uid(),
    'previous_status', v_business.status
  ));

  return jsonb_build_object('success', true, 'hold_id', v_hold_id);
end;
$$;

create or replace function public.apply_automatic_account_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate record;
  v_hold_id uuid;
  v_count integer := 0;
begin
  for v_candidate in
    select b.id, b.status, coalesce(b.contract_end_date, b.renewal_date) as due_date
    from public.businesses b
    where coalesce(b.status, 'active') = 'active'
      and coalesce(b.contract_end_date, b.renewal_date) is not null
      and coalesce(b.contract_end_date, b.renewal_date) + 3 < current_date
      and not exists (
        select 1 from public.subscription_payments sp
        where sp.business_id = b.id
          and sp.status = 'approved'
          and coalesce(sp.reviewed_at, sp.paid_at, sp.created_at)::date >= coalesce(b.contract_end_date, b.renewal_date)
      )
      and not exists (
        select 1 from public.account_holds h
        where h.business_id = b.id
          and (h.resolved_at is null or h.resolved_at::date >= coalesce(b.contract_end_date, b.renewal_date))
      )
    for update of b skip locked
  loop
    insert into public.account_holds (business_id, hold_type, reason, due_date, previous_status)
    values (
      v_candidate.id,
      'automatic',
      'Subscription expired and payment was not approved within the 3-day grace period.',
      v_candidate.due_date,
      v_candidate.status
    )
    returning id into v_hold_id;

    update public.businesses set status = 'on_hold' where id = v_candidate.id;

    insert into public.audit_logs (action, target_type, target_id, metadata)
    values ('account_hold.placed', 'business', v_candidate.id, jsonb_build_object(
      'hold_id', v_hold_id,
      'hold_type', 'automatic',
      'due_date', v_candidate.due_date,
      'grace_days', 3
    ));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.place_account_on_hold(uuid, text, text) from public, anon;
grant execute on function public.place_account_on_hold(uuid, text, text) to authenticated;
revoke all on function public.apply_automatic_account_holds() from public, anon, authenticated;
grant execute on function public.apply_automatic_account_holds() to service_role;