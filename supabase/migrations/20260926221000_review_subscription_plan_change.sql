CREATE OR REPLACE FUNCTION public.review_subscription_plan_change(
  p_payment_id uuid,
  p_action text,
  p_admin_notes text DEFAULT NULL
)
RETURNS TABLE (
  request_id uuid,
  business_id uuid,
  requested_plan_id text,
  review_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.subscription_payments%ROWTYPE;
  v_admin_id uuid := auth.uid();
  v_requested_plan_id text;
  v_reviewed_at timestamptz := now();
  v_next_metadata jsonb;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_super_admin_user(v_admin_id) THEN
    RAISE EXCEPTION 'Only authorized Super Admin users can review subscription plan changes';
  END IF;

  IF p_action NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Review action must be approved or rejected';
  END IF;

  SELECT *
  INTO v_request
  FROM public.subscription_payments
  WHERE id = p_payment_id
    AND status = 'pending'
    AND metadata->>'kind' = 'subscription_plan_change'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending subscription plan-change request not found';
  END IF;

  v_requested_plan_id := COALESCE(v_request.metadata->>'requested_plan_id', v_request.plan_id);

  IF v_requested_plan_id IS NULL OR v_requested_plan_id = '' THEN
    RAISE EXCEPTION 'Requested plan is missing from this plan-change request';
  END IF;

  v_next_metadata := COALESCE(v_request.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'notification_status', p_action,
      CASE WHEN p_action = 'approved' THEN 'approved_by' ELSE 'rejected_by' END, v_admin_id,
      CASE WHEN p_action = 'approved' THEN 'approved_at' ELSE 'rejected_at' END, v_reviewed_at,
      'business_notified_status', p_action
    );

  UPDATE public.subscription_payments
  SET
    status = p_action,
    admin_notes = p_admin_notes,
    reviewed_by = v_admin_id,
    reviewed_at = v_reviewed_at,
    metadata = v_next_metadata
  WHERE id = v_request.id;

  IF p_action = 'approved' THEN
    UPDATE public.businesses
    SET
      subscription_plan = v_requested_plan_id,
      subscription_status = 'active',
      status = 'active'
    WHERE id = v_request.business_id;
  END IF;

  RETURN QUERY
  SELECT v_request.id, v_request.business_id, v_requested_plan_id, p_action;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_subscription_plan_change(uuid, text, text) TO authenticated;