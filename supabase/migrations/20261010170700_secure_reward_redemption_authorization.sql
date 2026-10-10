create or replace function public.redeem_reward_tx(
  p_reward_code text,
  p_business_id uuid,
  p_location_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_staff_id uuid;
  v_reward_id uuid;
  v_reward_title text;
  v_expires_at timestamptz;
begin
  v_staff_id := auth.uid();

  if v_staff_id is null then
    return jsonb_build_object('success', false, 'message', 'Not authenticated');
  end if;

  if not public.is_business_operator(p_business_id, v_staff_id) then
    return jsonb_build_object('success', false, 'message', 'Not authorized for this business');
  end if;

  if p_location_id is not null
    and not exists (
      select 1
      from public.business_locations bl
      where bl.id = p_location_id
        and bl.business_id = p_business_id
    ) then
    return jsonb_build_object('success', false, 'message', 'Invalid redemption location');
  end if;

  if p_location_id is not null
    and not public.user_can_access_business_location(v_staff_id, p_business_id, p_location_id) then
    return jsonb_build_object('success', false, 'message', 'Not authorized for this location');
  end if;

  if not public.check_and_increment_rate_limit(v_staff_id::text || ':' || p_business_id::text, 'redeem_reward', 60, 3600) then
    return jsonb_build_object('success', false, 'message', 'Reward redemption limit reached. Please try again later.');
  end if;

  select id, reward_title, expires_at
  into v_reward_id, v_reward_title, v_expires_at
  from public.rewards
  where reward_code = p_reward_code
    and business_id = p_business_id
    and status = 'available'
  for update;

  if v_reward_id is null then
    return jsonb_build_object('success', false, 'message', 'Invalid or already redeemed reward code');
  end if;

  if v_expires_at is not null and now() >= v_expires_at then
    return jsonb_build_object(
      'success', false,
      'message', '⏰ Reward Expired. This reward can no longer be redeemed.',
      'reason', 'reward_expired'
    );
  end if;

  update public.rewards
  set status = 'redeemed',
      redeemed_at = now(),
      redeemed_by = v_staff_id,
      redeemed_location_id = p_location_id
  where id = v_reward_id
    and status = 'available'
    and (expires_at is null or now() < expires_at);

  if not found then
    return jsonb_build_object('success', false, 'message', 'Invalid or already redeemed reward code');
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Reward redeemed successfully',
    'reward_title', v_reward_title,
    'location_id', p_location_id
  );
end;
$function$;

revoke execute on function public.redeem_reward_tx(text, uuid) from public;
revoke execute on function public.redeem_reward_tx(text, uuid, uuid) from public;
revoke execute on function public.redeem_reward_by_qr_tx(uuid, uuid) from public;
revoke execute on function public.get_reward_by_qr_token(uuid, uuid) from public;

revoke execute on function public.redeem_reward_tx(text, uuid) from anon;
revoke execute on function public.redeem_reward_tx(text, uuid, uuid) from anon;
revoke execute on function public.redeem_reward_by_qr_tx(uuid, uuid) from anon;
revoke execute on function public.get_reward_by_qr_token(uuid, uuid) from anon;

grant execute on function public.redeem_reward_tx(text, uuid) to authenticated, service_role;
grant execute on function public.redeem_reward_tx(text, uuid, uuid) to authenticated, service_role;
grant execute on function public.redeem_reward_by_qr_tx(uuid, uuid) to authenticated, service_role;
grant execute on function public.get_reward_by_qr_token(uuid, uuid) to authenticated, service_role;