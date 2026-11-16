alter table public.setup_assistance_requests
  drop constraint if exists setup_assistance_requests_status_check;

alter table public.setup_assistance_requests
  add constraint setup_assistance_requests_status_check
  check (status in ('pending', 'accepted', 'ready_for_review', 'changes_requested', 'declined', 'completed'));

drop index if exists public.idx_setup_assistance_requests_active_unique;
create unique index idx_setup_assistance_requests_active_unique
  on public.setup_assistance_requests (business_id)
  where status in ('pending', 'accepted', 'ready_for_review', 'changes_requested');

alter table public.setup_assistance_requests
  add column if not exists ready_for_review_at timestamptz,
  add column if not exists review_round integer not null default 0,
  add column if not exists change_request_feedback text,
  add column if not exists changes_requested_at timestamptz,
  add column if not exists changes_requested_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists activated_program_id uuid references public.loyalty_programs(id) on delete set null,
  add column if not exists activated_draft_id uuid references public.setup_drafts(id) on delete set null,
  add column if not exists activated_draft_updated_at timestamptz;

alter table public.setup_assistance_requests
  drop constraint if exists setup_assistance_requests_feedback_length;
alter table public.setup_assistance_requests
  add constraint setup_assistance_requests_feedback_length
  check (change_request_feedback is null or char_length(change_request_feedback) between 10 and 1000);

create or replace function public.user_can_manage_setup_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.businesses b where b.id = p_business_id and b.owner_id = auth.uid())
    or exists (
      select 1 from public.business_users bu
      where bu.business_id = p_business_id
        and bu.user_id = auth.uid()
        and bu.status = 'active'
        and bu.role in ('owner', 'admin', 'corporate_admin')
    )
  );
$$;

create or replace function public.approve_setup_request(p_request_id uuid, p_expected_draft_updated_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.setup_assistance_requests%rowtype;
  v_draft public.setup_drafts%rowtype;
  v_program jsonb;
  v_branding jsonb;
  v_target integer;
  v_program_id uuid;
  v_conflicts integer;
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'SETUP_NOT_AUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_request from public.setup_assistance_requests where id = p_request_id for update;
  if not found then
    raise exception 'SETUP_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not public.user_can_manage_setup_business(v_request.business_id) then
    raise exception 'SETUP_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if v_request.status = 'completed' then
    return jsonb_build_object('success', true, 'already_completed', true, 'program_id', v_request.activated_program_id);
  end if;

  if v_request.status <> 'ready_for_review' then
    raise exception 'SETUP_NOT_READY_FOR_REVIEW';
  end if;

  select * into v_draft
  from public.setup_drafts
  where setup_request_id = v_request.id and business_id = v_request.business_id
  for update;

  if not found then
    raise exception 'SETUP_DRAFT_NOT_FOUND';
  end if;

  if p_expected_draft_updated_at is null or v_draft.updated_at <> p_expected_draft_updated_at then
    raise exception 'SETUP_DRAFT_CHANGED';
  end if;

  v_program := coalesce(v_draft.program, '{}'::jsonb);
  v_branding := coalesce(v_draft.branding, '{}'::jsonb);
  v_target := nullif(v_program->>'stamp_target', '')::integer;

  if v_target is null or v_target < 2 or v_target > 50
     or coalesce(btrim(v_program->>'name'), '') = ''
     or coalesce(btrim(v_program->>'reward_title'), '') = '' then
    raise exception 'SETUP_DRAFT_INVALID';
  end if;

  if v_draft.target_program_id is not null then
    perform 1 from public.loyalty_programs
    where id = v_draft.target_program_id and business_id = v_request.business_id
    for update;

    if not found then
      raise exception 'SETUP_TARGET_PROGRAM_INVALID';
    end if;

    select count(*) into v_conflicts
    from public.customer_loyalty_cards
    where loyalty_program_id = v_draft.target_program_id
      and business_id = v_request.business_id
      and coalesce(current_stamps, 0) >= v_target;

    if v_conflicts > 0 then
      raise exception 'SETUP_STAMP_TARGET_CONFLICT:%', v_conflicts;
    end if;

    update public.loyalty_programs set
      name = btrim(v_program->>'name'),
      description = nullif(v_program->>'description', ''),
      stamp_target = v_target,
      reward_title = btrim(v_program->>'reward_title'),
      reward_description = nullif(v_program->>'reward_description', ''),
      reward_expiration_days = nullif(v_program->>'reward_expiration_days', '')::integer,
      template_id = v_program->>'template_id',
      bg_color = v_program->>'bg_color',
      primary_color = v_program->>'primary_color',
      secondary_color = nullif(v_program->>'secondary_color', ''),
      text_color = v_program->>'text_color',
      card_color = v_program->>'primary_color',
      stamp_icon = v_program->>'stamp_icon',
      reward_icon = v_program->>'reward_icon',
      card_logo_url = nullif(v_program->>'card_logo_url', ''),
      card_banner_url = nullif(v_program->>'card_banner_url', ''),
      updated_at = v_now
    where id = v_draft.target_program_id and business_id = v_request.business_id
    returning id into v_program_id;
  else
    insert into public.loyalty_programs (
      business_id, name, description, stamp_target, reward_title, reward_description,
      reward_expiration_days, template_id, bg_color, primary_color, secondary_color, text_color,
      card_color, stamp_icon, reward_icon, card_logo_url, card_banner_url, active
    ) values (
      v_request.business_id,
      btrim(v_program->>'name'),
      nullif(v_program->>'description', ''),
      v_target,
      btrim(v_program->>'reward_title'),
      nullif(v_program->>'reward_description', ''),
      nullif(v_program->>'reward_expiration_days', '')::integer,
      v_program->>'template_id',
      v_program->>'bg_color',
      v_program->>'primary_color',
      nullif(v_program->>'secondary_color', ''),
      v_program->>'text_color',
      v_program->>'primary_color',
      v_program->>'stamp_icon',
      v_program->>'reward_icon',
      nullif(v_program->>'card_logo_url', ''),
      nullif(v_program->>'card_banner_url', ''),
      true
    )
    returning id into v_program_id;
  end if;

  update public.businesses set
    logo = coalesce(nullif(v_branding->>'logo', ''), logo),
    primary_color = coalesce(nullif(v_branding->>'primary_color', ''), primary_color),
    secondary_color = coalesce(nullif(v_branding->>'secondary_color', ''), secondary_color)
  where id = v_request.business_id;

  update public.setup_assistance_requests set
    status = 'completed',
    approved_at = v_now,
    approved_by = auth.uid(),
    activated_program_id = v_program_id,
    activated_draft_id = v_draft.id,
    activated_draft_updated_at = v_draft.updated_at,
    updated_at = v_now
  where id = v_request.id;

  return jsonb_build_object('success', true, 'already_completed', false, 'program_id', v_program_id);
end;
$$;

create or replace function public.request_setup_changes(p_request_id uuid, p_feedback text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.setup_assistance_requests%rowtype;
  v_feedback text := btrim(coalesce(p_feedback, ''));
begin
  if auth.uid() is null then
    raise exception 'SETUP_NOT_AUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_request from public.setup_assistance_requests where id = p_request_id for update;
  if not found then
    raise exception 'SETUP_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not public.user_can_manage_setup_business(v_request.business_id) then
    raise exception 'SETUP_NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if v_request.status <> 'ready_for_review' then
    raise exception 'SETUP_NOT_READY_FOR_REVIEW';
  end if;

  if char_length(v_feedback) < 10 or char_length(v_feedback) > 1000 then
    raise exception 'SETUP_FEEDBACK_INVALID';
  end if;

  update public.setup_assistance_requests set
    status = 'changes_requested',
    change_request_feedback = v_feedback,
    changes_requested_at = now(),
    changes_requested_by = auth.uid(),
    updated_at = now()
  where id = v_request.id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.user_can_manage_setup_business(uuid) from public, anon;
revoke all on function public.approve_setup_request(uuid, timestamptz) from public, anon;
revoke all on function public.request_setup_changes(uuid, text) from public, anon;
grant execute on function public.user_can_manage_setup_business(uuid) to authenticated;
grant execute on function public.approve_setup_request(uuid, timestamptz) to authenticated;
grant execute on function public.request_setup_changes(uuid, text) to authenticated;