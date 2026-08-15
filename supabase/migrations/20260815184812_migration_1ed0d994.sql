ALTER TABLE public.loyalty_programs
ADD COLUMN IF NOT EXISTS card_template text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS stamp_icon text DEFAULT 'Coffee',
ADD COLUMN IF NOT EXISTS reward_icon text DEFAULT 'Gift',
ADD COLUMN IF NOT EXISTS card_color text DEFAULT '#F87171';

CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_reward_code text,
  p_business_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward record;
  v_staff_id uuid;
  v_role text;
BEGIN
  -- Validate caller is authenticated staff
  v_staff_id := auth.uid();
  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized. Must be logged in.');
  END IF;

  SELECT role INTO v_role FROM public.business_users 
  WHERE user_id = v_staff_id AND business_id = p_business_id AND status = 'active';

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized for this business.');
  END IF;

  -- Find reward
  SELECT * INTO v_reward FROM public.rewards 
  WHERE reward_code = p_reward_code AND business_id = p_business_id FOR UPDATE;

  IF v_reward IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reward not found or invalid.');
  END IF;

  -- Prevent double redemption
  IF v_reward.status = 'redeemed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'This reward has already been redeemed.');
  END IF;

  IF v_reward.status = 'expired' OR (v_reward.expires_at IS NOT NULL AND v_reward.expires_at < now()) THEN
    RETURN jsonb_build_object('success', false, 'message', 'This reward has expired.');
  END IF;

  IF v_reward.status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reward is not available (Status: ' || v_reward.status || ').');
  END IF;

  -- Perform redemption
  UPDATE public.rewards
  SET status = 'redeemed', redeemed_at = now(), redeemed_by = v_staff_id
  WHERE id = v_reward.id;

  RETURN jsonb_build_object('success', true, 'message', 'Reward successfully redeemed.', 'reward_title', v_reward.reward_title);
END;
$$;