CREATE OR REPLACE FUNCTION public.can_view_loyalty_program(
  p_program_id uuid,
  p_business_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.is_super_admin_user(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = p_business_id
        AND b.owner_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_users bu
      WHERE bu.business_id = p_business_id
        AND bu.user_id = p_user_id
        AND bu.status = 'active'
        AND bu.role IN ('owner', 'staff')
    )
    OR EXISTS (
      SELECT 1
      FROM public.customer_loyalty_cards clc
      JOIN public.customers c ON c.id = clc.customer_id
      WHERE clc.loyalty_program_id = p_program_id
        AND clc.business_id = p_business_id
        AND c.user_id = p_user_id
    );
$function$;

DROP POLICY IF EXISTS loyalty_programs_public_read ON public.loyalty_programs;
DROP POLICY IF EXISTS loyalty_programs_staff_read ON public.loyalty_programs;
DROP POLICY IF EXISTS loyalty_programs_select_authorized ON public.loyalty_programs;

CREATE POLICY loyalty_programs_select_authorized
ON public.loyalty_programs
FOR SELECT
USING (public.can_view_loyalty_program(id, business_id, auth.uid()));