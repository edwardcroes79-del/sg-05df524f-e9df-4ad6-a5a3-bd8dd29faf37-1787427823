alter table public.manual_payment_reminders
  add column if not exists archived_at timestamp with time zone;

alter table public.manual_payment_reminders
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

create or replace function public.guard_manual_payment_reminder_mutations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin_user(auth.uid()) then
    if new.business_id is distinct from old.business_id
      or new.subscription_payment_id is distinct from old.subscription_payment_id
      or new.recipient_user_id is distinct from old.recipient_user_id
      or new.message is distinct from old.message
      or new.sent_by is distinct from old.sent_by
      or new.sent_at is distinct from old.sent_at
      or new.metadata is distinct from old.metadata
      or new.archived_at is distinct from old.archived_at
      or new.archived_by is distinct from old.archived_by then
      raise exception 'Business administrators may only mark reminders as displayed or dismissed.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_manual_payment_reminder_mutations on public.manual_payment_reminders;

create trigger guard_manual_payment_reminder_mutations
before update on public.manual_payment_reminders
for each row
execute function public.guard_manual_payment_reminder_mutations();

create or replace function public.archive_manual_payment_reminder(p_reminder_id uuid)
returns public.manual_payment_reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_reminder public.manual_payment_reminders%rowtype;
begin
  if v_admin_id is null or not public.is_super_admin_user(v_admin_id) then
    raise exception 'Not authorized to archive manual payment reminders.';
  end if;

  select *
  into v_reminder
  from public.manual_payment_reminders
  where id = p_reminder_id
  for update;

  if not found then
    raise exception 'Manual payment reminder not found.';
  end if;

  if v_reminder.archived_at is null then
    update public.manual_payment_reminders
    set archived_at = now(),
        archived_by = v_admin_id
    where id = p_reminder_id
    returning * into v_reminder;

    insert into public.audit_logs (
      admin_user_id,
      action,
      target_type,
      target_id,
      metadata
    ) values (
      v_admin_id,
      'manual_payment_reminder_archived',
      'manual_payment_reminder',
      p_reminder_id::text,
      jsonb_build_object(
        'business_id', v_reminder.business_id,
        'recipient_user_id', v_reminder.recipient_user_id,
        'subscription_payment_id', v_reminder.subscription_payment_id,
        'sent_at', v_reminder.sent_at,
        'dismissed_at', v_reminder.dismissed_at
      )
    );
  end if;

  return v_reminder;
end;
$$;

grant execute on function public.archive_manual_payment_reminder(uuid) to authenticated;