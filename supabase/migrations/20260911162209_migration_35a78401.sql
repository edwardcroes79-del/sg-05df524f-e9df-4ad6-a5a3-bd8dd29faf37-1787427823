CREATE TABLE IF NOT EXISTS public.reward_qr_tokens (
    token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '60 seconds'
);

ALTER TABLE public.reward_qr_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own qr tokens" ON public.reward_qr_tokens;
CREATE POLICY "Customers can view own qr tokens" 
ON public.reward_qr_tokens FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.rewards WHERE id = reward_qr_tokens.reward_id));

DROP POLICY IF EXISTS "Businesses can view their qr tokens" ON public.reward_qr_tokens;
CREATE POLICY "Businesses can view their qr tokens" 
ON public.reward_qr_tokens FOR SELECT 
USING (public.can_access_business(business_id));

CREATE OR REPLACE FUNCTION public.generate_reward_qr_token(p_reward_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_business_id UUID;
    v_status TEXT;
    v_token UUID;
BEGIN
    SELECT customer_id, business_id, status 
    INTO v_customer_id, v_business_id, v_status
    FROM public.rewards 
    WHERE id = p_reward_id AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reward not found or unauthorized';
    END IF;
    
    IF v_status != 'available' THEN
        RAISE EXCEPTION 'Reward is not available for redemption';
    END IF;
    
    DELETE FROM public.reward_qr_tokens WHERE reward_id = p_reward_id;
    
    INSERT INTO public.reward_qr_tokens (reward_id, customer_id, business_id)
    VALUES (p_reward_id, v_customer_id, v_business_id)
    RETURNING token INTO v_token;
    
    RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_reward_by_qr_tx(p_token UUID, p_business_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    v_result := public.redeem_reward_tx(p_business_id, v_reward_code);
    
    DELETE FROM public.reward_qr_tokens WHERE token = p_token;
    
    RETURN v_result;
END;
$$;