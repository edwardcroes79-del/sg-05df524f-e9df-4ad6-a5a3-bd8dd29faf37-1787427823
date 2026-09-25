CREATE OR REPLACE FUNCTION public.get_reward_by_qr_token(p_token uuid, p_business_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_token_record RECORD;
    v_reward_record RECORD;
    v_result json;
BEGIN
    SELECT *
    INTO v_token_record
    FROM public.reward_qr_tokens
    WHERE token = p_token;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid QR token';
    END IF;

    IF NOW() >= v_token_record.expires_at THEN
        DELETE FROM public.reward_qr_tokens WHERE token = p_token;
        RAISE EXCEPTION 'QR code has expired';
    END IF;

    SELECT
        r.id,
        r.reward_title,
        r.status,
        r.customer_id,
        r.expires_at,
        c.name AS customer_name,
        lp.name AS program_name,
        r.business_id
    INTO v_reward_record
    FROM public.rewards r
    LEFT JOIN public.customers c ON r.customer_id = c.id
    LEFT JOIN public.loyalty_programs lp ON r.loyalty_program_id = lp.id
    WHERE r.id = v_token_record.reward_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reward not found';
    END IF;

    IF v_reward_record.business_id != p_business_id THEN
        RAISE EXCEPTION 'Unauthorized business';
    END IF;

    IF v_reward_record.status != 'available' THEN
        RAISE EXCEPTION 'Reward is no longer available';
    END IF;

    IF v_reward_record.expires_at IS NOT NULL AND NOW() >= v_reward_record.expires_at THEN
        RAISE EXCEPTION 'Reward Expired';
    END IF;

    v_result := json_build_object(
        'reward_id', v_reward_record.id,
        'reward_title', v_reward_record.reward_title,
        'status', v_reward_record.status,
        'customer_name', v_reward_record.customer_name,
        'program_name', v_reward_record.program_name
    );

    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.redeem_reward_tx(p_reward_code text, p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_staff_id UUID;
  v_reward_id UUID;
  v_reward_title TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF NOT public.is_business_operator(p_business_id, v_staff_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized for this business');
  END IF;

  IF NOT public.check_and_increment_rate_limit(v_staff_id::text || ':' || p_business_id::text, 'redeem_reward', 60, 3600) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reward redemption limit reached. Please try again later.');
  END IF;

  SELECT id, reward_title, expires_at
  INTO v_reward_id, v_reward_title, v_expires_at
  FROM public.rewards
  WHERE reward_code = p_reward_code
    AND business_id = p_business_id
    AND status = 'available'
  FOR UPDATE;

  IF v_reward_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or already redeemed reward code');
  END IF;

  IF v_expires_at IS NOT NULL AND now() >= v_expires_at THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', '⏰ Reward Expired. This reward can no longer be redeemed.',
      'reason', 'reward_expired'
    );
  END IF;

  UPDATE public.rewards
  SET status = 'redeemed',
      redeemed_at = now(),
      redeemed_by = v_staff_id
  WHERE id = v_reward_id
    AND status = 'available'
    AND (expires_at IS NULL OR now() < expires_at);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or already redeemed reward code');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reward redeemed successfully',
    'reward_title', v_reward_title
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.redeem_reward_by_qr_tx(p_token uuid, p_business_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_reward_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_reward_code TEXT;
    v_result JSON;
BEGIN
    SELECT reward_id, expires_at 
    INTO v_reward_id, v_expires_at
    FROM public.reward_qr_tokens
    WHERE token = p_token AND business_id = p_business_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or unrecognized QR code';
    END IF;
    
    IF NOW() >= v_expires_at THEN
        DELETE FROM public.reward_qr_tokens WHERE token = p_token;
        RAISE EXCEPTION 'QR code has expired. Please ask the customer to generate a new one.';
    END IF;
    
    SELECT reward_code
    INTO v_reward_code
    FROM public.rewards
    WHERE id = v_reward_id AND status = 'available';
    
    IF NOT FOUND THEN
        DELETE FROM public.reward_qr_tokens WHERE token = p_token;
        RAISE EXCEPTION 'Reward is no longer available';
    END IF;
    
    v_result := public.redeem_reward_tx(
        p_reward_code := v_reward_code,
        p_business_id := p_business_id
    );
    
    DELETE FROM public.reward_qr_tokens WHERE token = p_token;
    
    RETURN v_result;
END;
$function$;