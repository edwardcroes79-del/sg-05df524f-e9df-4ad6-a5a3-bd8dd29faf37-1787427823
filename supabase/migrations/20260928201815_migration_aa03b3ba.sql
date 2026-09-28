CREATE TABLE IF NOT EXISTS public.quick_stamp_qr_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 seconds'),
  used_at timestamptz
);

ALTER TABLE public.quick_stamp_qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quick_stamp_qr_tokens_business_id
ON public.quick_stamp_qr_tokens(business_id);

CREATE INDEX IF NOT EXISTS idx_quick_stamp_qr_tokens_expires_at
ON public.quick_stamp_qr_tokens(expires_at);

INSERT INTO public.subscription_addons (
  id,
  name,
  slug,
  description,
  addon_type,
  capacity_amount,
  monthly_price_awg,
  status,
  display_order,
  metadata,
  updated_at
) VALUES (
  'quick_stamp_qr',
  '⚡ Quick Stamp QR',
  'quick-stamp-qr',
  'Optional add-on that unlocks a secure 60-second rotating QR code for future quick stamp issuance.',
  'quick_stamp_qr',
  1,
  0,
  'active',
  20,
  jsonb_build_object('entitlement_key', 'quick_stamp_qr', 'token_ttl_seconds', 60),
  now()
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    addon_type = EXCLUDED.addon_type,
    capacity_amount = EXCLUDED.capacity_amount,
    metadata = EXCLUDED.metadata,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.business_has_active_quick_stamp_qr(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_addon_subscriptions bas
    JOIN public.subscription_addons sa ON sa.id = bas.addon_id
    WHERE bas.business_id = p_business_id
      AND bas.status = 'active'
      AND bas.payment_status = 'approved'
      AND (bas.current_period_end IS NULL OR bas.current_period_end > now())
      AND sa.status = 'active'
      AND (
        sa.id = 'quick_stamp_qr'
        OR sa.slug = 'quick-stamp-qr'
        OR sa.addon_type = 'quick_stamp_qr'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_quick_stamp_qr_token(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staff_id uuid;
  v_token uuid;
  v_expires_at timestamptz;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  IF NOT public.can_access_business(p_business_id, v_staff_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authorized for this business');
  END IF;

  IF NOT public.business_has_active_quick_stamp_qr(p_business_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Quick Stamp QR add-on is not active for this business');
  END IF;

  DELETE FROM public.quick_stamp_qr_tokens
  WHERE expires_at <= now()
     OR (business_id = p_business_id AND staff_user_id = v_staff_id);

  INSERT INTO public.quick_stamp_qr_tokens (business_id, staff_user_id)
  VALUES (p_business_id, v_staff_id)
  RETURNING token, expires_at INTO v_token, v_expires_at;

  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'business_id', p_business_id,
    'expires_at', v_expires_at,
    'ttl_seconds', 60
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.business_has_active_quick_stamp_qr(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quick_stamp_qr_token(uuid) TO authenticated;