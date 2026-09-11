DROP FUNCTION IF EXISTS public.redeem_reward_by_qr_tx(uuid, uuid);

CREATE OR REPLACE FUNCTION public.redeem_reward_by_qr_tx(p_token uuid, p_business_id uuid, p_staff_user_id uuid)
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
    
    -- Delegate to the existing atomic transaction logic with proper named parameters
    v_result := public.redeem_reward_tx(
        p_reward_code := v_reward_code,
        p_business_id := p_business_id,
        p_staff_user_id := p_staff_user_id
    );
    
    DELETE FROM public.reward_qr_tokens WHERE token = p_token;
    
    RETURN v_result;
END;
$function$;