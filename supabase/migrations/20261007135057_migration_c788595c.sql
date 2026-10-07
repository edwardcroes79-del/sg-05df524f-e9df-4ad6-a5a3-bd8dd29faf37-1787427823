CREATE INDEX IF NOT EXISTS idx_stamp_transactions_business_program_location_created
ON public.stamp_transactions (business_id, loyalty_program_id, location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stamp_transactions_business_staff_location_created
ON public.stamp_transactions (business_id, staff_user_id, location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rewards_business_program_earned
ON public.rewards (business_id, loyalty_program_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_rewards_business_redeemed_at
ON public.rewards (business_id, redeemed_at DESC)
WHERE redeemed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quick_stamp_qr_tokens_business_location_created
ON public.quick_stamp_qr_tokens (business_id, location_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_corporate_advanced_analytics(
  p_business_id uuid,
  p_actor_user_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_location_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_business record;
  v_membership record;
  v_has_entitlement boolean := false;
  v_is_super_admin boolean := false;
  v_is_owner boolean := false;
  v_has_business_access boolean := false;
  v_can_view_all_locations boolean := false;
  v_accessible_location_ids uuid[] := '{}';
  v_total_customers integer := 0;
  v_active_customers integer := 0;
  v_new_customers integer := 0;
  v_returning_customers integer := 0;
  v_at_risk_customers integer := 0;
  v_inactive_customers integer := 0;
  v_never_returned_customers integer := 0;
  v_cross_location_customers integer := 0;
  v_stamps_issued integer := 0;
  v_rewards_earned integer := 0;
  v_rewards_redeemed integer := 0;
  v_redemption_rate numeric := 0;
  v_retention_rate numeric := 0;
  v_locations jsonb := '[]'::jsonb;
  v_programs jsonb := '[]'::jsonb;
  v_quick_qr jsonb := '{}'::jsonb;
  v_cross_location jsonb := '{}'::jsonb;
  v_trends jsonb := '[]'::jsonb;
  v_insights jsonb := '[]'::jsonb;
  v_top_location jsonb := NULL;
  v_under_location jsonb := NULL;
  v_avg_location_retention numeric := 0;
BEGIN
  IF p_business_id IS NULL OR p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Business and authenticated user are required.';
  END IF;

  IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at < p_start_at THEN
    RAISE EXCEPTION 'A valid analytics date range is required.';
  END IF;

  SELECT id, owner_id, subscription_plan, business_name
  INTO v_business
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found.';
  END IF;

  SELECT COALESCE(public.is_super_admin_user(p_actor_user_id), false) INTO v_is_super_admin;
  v_is_owner := v_business.owner_id = p_actor_user_id;

  SELECT id, role, status
  INTO v_membership
  FROM public.business_users
  WHERE business_id = p_business_id
    AND user_id = p_actor_user_id
    AND status = 'active'
  LIMIT 1;

  v_has_business_access := v_is_super_admin OR v_is_owner OR v_membership.id IS NOT NULL;

  IF NOT v_has_business_access THEN
    RAISE EXCEPTION 'Business access required.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.plan_entitlements pe
    WHERE pe.plan_id = v_business.subscription_plan
      AND pe.key = 'advanced_analytics'
      AND pe.value_type = 'boolean'
      AND pe.boolean_value = true
  ) INTO v_has_entitlement;

  IF NOT v_has_entitlement THEN
    RAISE EXCEPTION 'Corporate Advanced Analytics is not enabled for this business.';
  END IF;

  v_can_view_all_locations := v_is_super_admin
    OR v_is_owner
    OR COALESCE(v_membership.role, '') IN ('owner', 'admin', 'corporate_admin');

  IF v_can_view_all_locations THEN
    SELECT COALESCE(array_agg(id ORDER BY name), '{}'::uuid[])
    INTO v_accessible_location_ids
    FROM public.business_locations
    WHERE business_id = p_business_id;
  ELSE
    SELECT COALESCE(array_agg(bul.location_id ORDER BY bl.name), '{}'::uuid[])
    INTO v_accessible_location_ids
    FROM public.business_user_locations bul
    JOIN public.business_users bu ON bu.id = bul.business_user_id
    JOIN public.business_locations bl ON bl.id = bul.location_id
    WHERE bu.business_id = p_business_id
      AND bu.user_id = p_actor_user_id
      AND bu.status = 'active'
      AND bul.status = 'active';
  END IF;

  IF p_location_id IS NOT NULL AND NOT (p_location_id = ANY(v_accessible_location_ids)) THEN
    RAISE EXCEPTION 'Location analytics access denied.';
  END IF;

  WITH scoped_cards AS (
    SELECT DISTINCT clc.customer_id, min(clc.created_at) AS first_joined_at
    FROM public.customer_loyalty_cards clc
    WHERE clc.business_id = p_business_id
      AND clc.customer_id IS NOT NULL
      AND (
        p_location_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.stamp_transactions st
          WHERE st.business_id = p_business_id
            AND st.customer_id = clc.customer_id
            AND st.location_id = p_location_id
        )
      )
      AND (
        v_can_view_all_locations
        OR EXISTS (
          SELECT 1
          FROM public.stamp_transactions st
          WHERE st.business_id = p_business_id
            AND st.customer_id = clc.customer_id
            AND st.location_id = ANY(v_accessible_location_ids)
        )
      )
    GROUP BY clc.customer_id
  ),
  scoped_stamps AS (
    SELECT *
    FROM public.stamp_transactions st
    WHERE st.business_id = p_business_id
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
      AND (p_location_id IS NULL OR st.location_id = p_location_id)
      AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids))
  ),
  customer_activity AS (
    SELECT sc.customer_id, count(ss.id) AS stamp_count, max(ss.created_at) AS last_stamp_at
    FROM scoped_cards sc
    LEFT JOIN scoped_stamps ss ON ss.customer_id = sc.customer_id
    GROUP BY sc.customer_id
  ),
  lifetime_location_counts AS (
    SELECT st.customer_id, count(DISTINCT st.location_id) FILTER (WHERE st.location_id IS NOT NULL) AS location_count
    FROM public.stamp_transactions st
    WHERE st.business_id = p_business_id
      AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids))
    GROUP BY st.customer_id
  )
  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE ca.stamp_count > 0)::integer,
    count(*) FILTER (WHERE sc.first_joined_at >= p_start_at AND sc.first_joined_at <= p_end_at)::integer,
    count(*) FILTER (WHERE ca.stamp_count >= 2)::integer,
    count(*) FILTER (WHERE ca.last_stamp_at < (p_end_at - interval '30 days') AND ca.last_stamp_at >= (p_end_at - interval '90 days'))::integer,
    count(*) FILTER (WHERE ca.last_stamp_at < (p_end_at - interval '90 days'))::integer,
    count(*) FILTER (WHERE ca.last_stamp_at IS NULL)::integer,
    count(*) FILTER (WHERE COALESCE(llc.location_count, 0) > 1)::integer
  INTO
    v_total_customers,
    v_active_customers,
    v_new_customers,
    v_returning_customers,
    v_at_risk_customers,
    v_inactive_customers,
    v_never_returned_customers,
    v_cross_location_customers
  FROM scoped_cards sc
  JOIN customer_activity ca ON ca.customer_id = sc.customer_id
  LEFT JOIN lifetime_location_counts llc ON llc.customer_id = sc.customer_id;

  SELECT count(*)::integer
  INTO v_stamps_issued
  FROM public.stamp_transactions st
  WHERE st.business_id = p_business_id
    AND st.created_at >= p_start_at
    AND st.created_at <= p_end_at
    AND (p_location_id IS NULL OR st.location_id = p_location_id)
    AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids));

  SELECT count(*)::integer
  INTO v_rewards_earned
  FROM public.rewards r
  WHERE r.business_id = p_business_id
    AND r.earned_at >= p_start_at
    AND r.earned_at <= p_end_at
    AND (p_location_id IS NULL OR r.earned_location_id = p_location_id)
    AND (v_can_view_all_locations OR r.earned_location_id = ANY(v_accessible_location_ids));

  SELECT count(*)::integer
  INTO v_rewards_redeemed
  FROM public.rewards r
  WHERE r.business_id = p_business_id
    AND r.status = 'redeemed'
    AND r.redeemed_at >= p_start_at
    AND r.redeemed_at <= p_end_at
    AND (p_location_id IS NULL OR r.redeemed_location_id = p_location_id)
    AND (v_can_view_all_locations OR r.redeemed_location_id = ANY(v_accessible_location_ids));

  v_redemption_rate := CASE WHEN v_rewards_earned > 0 THEN round((v_rewards_redeemed::numeric / v_rewards_earned::numeric) * 100, 2) ELSE 0 END;
  v_retention_rate := CASE WHEN v_active_customers > 0 THEN round((v_returning_customers::numeric / v_active_customers::numeric) * 100, 2) ELSE 0 END;

  WITH location_metrics AS (
    SELECT
      bl.id,
      bl.name,
      bl.status,
      count(DISTINCT st.customer_id)::integer AS customers,
      count(DISTINCT st.customer_id) FILTER (WHERE st.created_at >= p_start_at AND st.created_at <= p_end_at)::integer AS active_customers,
      count(st.id)::integer AS stamps,
      count(DISTINCT r.id) FILTER (WHERE r.earned_at >= p_start_at AND r.earned_at <= p_end_at)::integer AS rewards_earned,
      count(DISTINCT rr.id) FILTER (WHERE rr.redeemed_at >= p_start_at AND rr.redeemed_at <= p_end_at)::integer AS rewards_redeemed,
      CASE
        WHEN count(DISTINCT st.customer_id) FILTER (WHERE st.created_at >= p_start_at AND st.created_at <= p_end_at) > 0
        THEN round((count(DISTINCT st.customer_id) FILTER (WHERE st.created_at >= p_start_at AND st.created_at <= p_end_at AND st.customer_id IN (
          SELECT customer_id
          FROM public.stamp_transactions rst
          WHERE rst.business_id = p_business_id
            AND rst.location_id = bl.id
            AND rst.created_at >= p_start_at
            AND rst.created_at <= p_end_at
          GROUP BY customer_id
          HAVING count(*) >= 2
        ))::numeric / count(DISTINCT st.customer_id) FILTER (WHERE st.created_at >= p_start_at AND st.created_at <= p_end_at)::numeric) * 100, 2)
        ELSE 0
      END AS retention
    FROM public.business_locations bl
    LEFT JOIN public.stamp_transactions st ON st.business_id = bl.business_id
      AND st.location_id = bl.id
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
    LEFT JOIN public.rewards r ON r.business_id = bl.business_id
      AND r.earned_location_id = bl.id
      AND r.earned_at >= p_start_at
      AND r.earned_at <= p_end_at
    LEFT JOIN public.rewards rr ON rr.business_id = bl.business_id
      AND rr.redeemed_location_id = bl.id
      AND rr.redeemed_at >= p_start_at
      AND rr.redeemed_at <= p_end_at
      AND rr.status = 'redeemed'
    WHERE bl.business_id = p_business_id
      AND bl.id = ANY(v_accessible_location_ids)
      AND (p_location_id IS NULL OR bl.id = p_location_id)
    GROUP BY bl.id, bl.name, bl.status
  )
  SELECT
    COALESCE(jsonb_agg(to_jsonb(location_metrics) ORDER BY stamps DESC, name), '[]'::jsonb),
    COALESCE((SELECT to_jsonb(lm) FROM location_metrics lm ORDER BY lm.stamps DESC, lm.active_customers DESC, lm.name LIMIT 1), NULL),
    COALESCE((SELECT to_jsonb(lm) FROM location_metrics lm WHERE lm.stamps > 0 OR lm.active_customers > 0 ORDER BY lm.stamps ASC, lm.active_customers ASC, lm.name LIMIT 1), NULL),
    COALESCE((SELECT round(avg(lm.retention), 2) FROM location_metrics lm WHERE lm.active_customers > 0), 0)
  INTO v_locations, v_top_location, v_under_location, v_avg_location_retention
  FROM location_metrics;

  WITH program_metrics AS (
    SELECT
      lp.id,
      lp.name,
      lp.active,
      count(DISTINCT clc.customer_id)::integer AS members,
      count(st.id)::integer AS stamps,
      CASE WHEN count(DISTINCT clc.customer_id) > 0 THEN round((count(r.id)::numeric / count(DISTINCT clc.customer_id)::numeric) * 100, 2) ELSE 0 END AS completion_rate,
      count(r.id)::integer AS rewards_earned,
      count(r.id) FILTER (WHERE r.status = 'redeemed')::integer AS rewards_redeemed,
      CASE WHEN count(r.id) > 0 THEN round((count(r.id) FILTER (WHERE r.status = 'redeemed')::numeric / count(r.id)::numeric) * 100, 2) ELSE 0 END AS redemption_rate
    FROM public.loyalty_programs lp
    LEFT JOIN public.customer_loyalty_cards clc ON clc.loyalty_program_id = lp.id
    LEFT JOIN public.stamp_transactions st ON st.loyalty_program_id = lp.id
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
      AND (p_location_id IS NULL OR st.location_id = p_location_id)
      AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids))
    LEFT JOIN public.rewards r ON r.loyalty_program_id = lp.id
      AND r.earned_at >= p_start_at
      AND r.earned_at <= p_end_at
      AND (p_location_id IS NULL OR r.earned_location_id = p_location_id)
      AND (v_can_view_all_locations OR r.earned_location_id = ANY(v_accessible_location_ids))
    WHERE lp.business_id = p_business_id
    GROUP BY lp.id, lp.name, lp.active
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(program_metrics) ORDER BY stamps DESC, name), '[]'::jsonb)
  INTO v_programs
  FROM program_metrics;

  WITH quick_qr_tokens AS (
    SELECT *
    FROM public.quick_stamp_qr_tokens qq
    WHERE qq.business_id = p_business_id
      AND qq.created_at >= p_start_at
      AND qq.created_at <= p_end_at
      AND (p_location_id IS NULL OR qq.location_id = p_location_id)
      AND (v_can_view_all_locations OR qq.location_id = ANY(v_accessible_location_ids))
  ),
  quick_qr_stamps AS (
    SELECT *
    FROM public.stamp_transactions st
    WHERE st.business_id = p_business_id
      AND st.verification_method = 'quick_stamp_qr'
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
      AND (p_location_id IS NULL OR st.location_id = p_location_id)
      AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids))
  )
  SELECT jsonb_build_object(
    'tokens_generated', (SELECT count(*) FROM quick_qr_tokens),
    'tokens_used', (SELECT count(*) FROM quick_qr_tokens WHERE used_at IS NOT NULL),
    'stamps_generated', (SELECT count(*) FROM quick_qr_stamps),
    'activity_by_location', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'location_id', bl.id,
        'location_name', bl.name,
        'tokens_generated', COALESCE(qt.tokens_generated, 0),
        'stamps_generated', COALESCE(qs.stamps_generated, 0)
      ) ORDER BY COALESCE(qs.stamps_generated, 0) DESC, bl.name)
      FROM public.business_locations bl
      LEFT JOIN (
        SELECT location_id, count(*) AS tokens_generated
        FROM quick_qr_tokens
        GROUP BY location_id
      ) qt ON qt.location_id = bl.id
      LEFT JOIN (
        SELECT location_id, count(*) AS stamps_generated
        FROM quick_qr_stamps
        GROUP BY location_id
      ) qs ON qs.location_id = bl.id
      WHERE bl.business_id = p_business_id
        AND bl.id = ANY(v_accessible_location_ids)
        AND (p_location_id IS NULL OR bl.id = p_location_id)
    ), '[]'::jsonb)
  ) INTO v_quick_qr;

  WITH customer_locations AS (
    SELECT customer_id, count(DISTINCT location_id) FILTER (WHERE location_id IS NOT NULL) AS location_count
    FROM public.stamp_transactions st
    WHERE st.business_id = p_business_id
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
      AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids))
    GROUP BY customer_id
  ),
  location_distribution AS (
    SELECT bl.id, bl.name, count(DISTINCT st.customer_id)::integer AS customers
    FROM public.business_locations bl
    LEFT JOIN public.stamp_transactions st ON st.location_id = bl.id
      AND st.business_id = p_business_id
      AND st.created_at >= p_start_at
      AND st.created_at <= p_end_at
    WHERE bl.business_id = p_business_id
      AND bl.id = ANY(v_accessible_location_ids)
    GROUP BY bl.id, bl.name
  )
  SELECT jsonb_build_object(
    'customers_visiting_multiple_locations', COALESCE((SELECT count(*) FROM customer_locations WHERE location_count > 1), 0),
    'distribution', COALESCE((SELECT jsonb_agg(to_jsonb(location_distribution) ORDER BY customers DESC, name) FROM location_distribution), '[]'::jsonb)
  ) INTO v_cross_location;

  WITH day_series AS (
    SELECT generate_series(date_trunc('day', p_start_at), date_trunc('day', p_end_at), interval '1 day') AS period_start
  ),
  trend_rows AS (
    SELECT
      ds.period_start::date AS date,
      count(DISTINCT st.customer_id)::integer AS active_customers,
      count(st.id)::integer AS stamps,
      count(r.id)::integer AS rewards_earned,
      count(rr.id)::integer AS rewards_redeemed
    FROM day_series ds
    LEFT JOIN public.stamp_transactions st ON st.business_id = p_business_id
      AND st.created_at >= ds.period_start
      AND st.created_at < ds.period_start + interval '1 day'
      AND (p_location_id IS NULL OR st.location_id = p_location_id)
      AND (v_can_view_all_locations OR st.location_id = ANY(v_accessible_location_ids))
    LEFT JOIN public.rewards r ON r.business_id = p_business_id
      AND r.earned_at >= ds.period_start
      AND r.earned_at < ds.period_start + interval '1 day'
      AND (p_location_id IS NULL OR r.earned_location_id = p_location_id)
      AND (v_can_view_all_locations OR r.earned_location_id = ANY(v_accessible_location_ids))
    LEFT JOIN public.rewards rr ON rr.business_id = p_business_id
      AND rr.status = 'redeemed'
      AND rr.redeemed_at >= ds.period_start
      AND rr.redeemed_at < ds.period_start + interval '1 day'
      AND (p_location_id IS NULL OR rr.redeemed_location_id = p_location_id)
      AND (v_can_view_all_locations OR rr.redeemed_location_id = ANY(v_accessible_location_ids))
    GROUP BY ds.period_start
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(trend_rows) ORDER BY date), '[]'::jsonb)
  INTO v_trends
  FROM trend_rows;

  IF v_top_location IS NOT NULL THEN
    v_insights := v_insights || jsonb_build_array(jsonb_build_object(
      'type', 'location_performance',
      'message', concat(v_top_location->>'name', ' has the highest stamp activity in the selected period with ', COALESCE(v_top_location->>'stamps', '0'), ' stamps.')
    ));
  END IF;

  IF v_under_location IS NOT NULL AND v_top_location IS NOT NULL AND (v_under_location->>'id') <> (v_top_location->>'id') THEN
    v_insights := v_insights || jsonb_build_array(jsonb_build_object(
      'type', 'underperforming_location',
      'message', concat(v_under_location->>'name', ' is below the current location activity benchmark for this period.')
    ));
  END IF;

  IF v_avg_location_retention > 0 AND v_top_location IS NOT NULL AND COALESCE((v_top_location->>'retention')::numeric, 0) > v_avg_location_retention THEN
    v_insights := v_insights || jsonb_build_array(jsonb_build_object(
      'type', 'retention',
      'message', concat(v_top_location->>'name', ' retention is ', round(COALESCE((v_top_location->>'retention')::numeric, 0) - v_avg_location_retention, 2), '% above the accessible location average.')
    ));
  END IF;

  IF v_cross_location_customers > 0 THEN
    v_insights := v_insights || jsonb_build_array(jsonb_build_object(
      'type', 'cross_location',
      'message', concat(v_cross_location_customers, ' customers have activity across more than one location.')
    ));
  END IF;

  RETURN jsonb_build_object(
    'business_id', p_business_id,
    'business_name', v_business.business_name,
    'range', jsonb_build_object('start_at', p_start_at, 'end_at', p_end_at),
    'filters', jsonb_build_object('location_id', p_location_id),
    'access', jsonb_build_object('can_view_all_locations', v_can_view_all_locations, 'accessible_location_ids', v_accessible_location_ids),
    'overview', jsonb_build_object(
      'total_customers', v_total_customers,
      'active_customers', v_active_customers,
      'new_customers', v_new_customers,
      'returning_customers', v_returning_customers,
      'customer_growth', v_new_customers,
      'retention_rate', v_retention_rate,
      'stamps_issued', v_stamps_issued,
      'rewards_earned', v_rewards_earned,
      'rewards_redeemed', v_rewards_redeemed,
      'redemption_rate', v_redemption_rate
    ),
    'customer_analytics', jsonb_build_object(
      'new_customers', v_new_customers,
      'active_customers', v_active_customers,
      'returning_customers', v_returning_customers,
      'at_risk_customers', v_at_risk_customers,
      'inactive_customers', v_inactive_customers,
      'never_returned_customers', v_never_returned_customers,
      'cross_location_customers', v_cross_location_customers
    ),
    'locations', v_locations,
    'programs', v_programs,
    'quick_qr', v_quick_qr,
    'cross_location', v_cross_location,
    'trends', v_trends,
    'insights', v_insights
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_corporate_advanced_analytics(uuid, uuid, timestamptz, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_corporate_advanced_analytics(uuid, uuid, timestamptz, timestamptz, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_corporate_advanced_analytics(uuid, uuid, timestamptz, timestamptz, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_corporate_advanced_analytics(uuid, uuid, timestamptz, timestamptz, uuid) TO service_role;