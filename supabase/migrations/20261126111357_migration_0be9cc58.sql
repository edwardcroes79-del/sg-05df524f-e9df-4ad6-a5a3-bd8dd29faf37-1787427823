CREATE TABLE IF NOT EXISTS public.staff_loyalty_program_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_user_id uuid NOT NULL,
  loyalty_program_id uuid NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_loyalty_program_assignments_unique
ON public.staff_loyalty_program_assignments (business_id, staff_user_id, loyalty_program_id);

CREATE INDEX IF NOT EXISTS idx_staff_loyalty_program_assignments_staff
ON public.staff_loyalty_program_assignments (staff_user_id);

CREATE INDEX IF NOT EXISTS idx_staff_loyalty_program_assignments_program
ON public.staff_loyalty_program_assignments (loyalty_program_id);

CREATE OR REPLACE FUNCTION public.can_manage_staff_loyalty_program_assignments(
  p_business_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_business_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF COALESCE(public.is_super_admin_user(p_user_id), false) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.owner_id = p_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = p_business_id
      AND bu.user_id = p_user_id
      AND bu.status = 'active'
      AND bu.role IN ('owner', 'admin', 'corporate_admin')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.staff_can_issue_loyalty_program(
  p_staff_user_id uuid,
  p_business_id uuid,
  p_loyalty_program_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_staff_user_id IS NULL OR p_business_id IS NULL OR p_loyalty_program_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = p_loyalty_program_id
      AND lp.business_id = p_business_id
      AND lp.active = true
  ) THEN
    RETURN false;
  END IF;

  IF COALESCE(public.is_super_admin_user(p_staff_user_id), false) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.owner_id = p_staff_user_id
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = p_business_id
      AND bu.user_id = p_staff_user_id
      AND bu.status = 'active'
      AND bu.role IN ('owner', 'admin', 'corporate_admin')
  ) THEN
    RETURN true;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = p_business_id
      AND bu.user_id = p_staff_user_id
      AND bu.status = 'active'
      AND bu.role = 'staff'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.staff_loyalty_program_assignments slpa
    WHERE slpa.business_id = p_business_id
      AND slpa.staff_user_id = p_staff_user_id
      AND slpa.loyalty_program_id = p_loyalty_program_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_staff_loyalty_program_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_program_business_id uuid;
BEGIN
  IF NEW.business_id IS NULL OR NEW.staff_user_id IS NULL OR NEW.loyalty_program_id IS NULL THEN
    RAISE EXCEPTION 'Business, staff user, and loyalty program are required';
  END IF;

  SELECT lp.business_id
  INTO v_program_business_id
  FROM public.loyalty_programs lp
  WHERE lp.id = NEW.loyalty_program_id;

  IF v_program_business_id IS NULL THEN
    RAISE EXCEPTION 'Loyalty program not found';
  END IF;

  IF v_program_business_id <> NEW.business_id THEN
    RAISE EXCEPTION 'Loyalty program does not belong to this business';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.business_id = NEW.business_id
      AND bu.user_id = NEW.staff_user_id
      AND bu.status = 'active'
      AND bu.role = 'staff'
  ) THEN
    RAISE EXCEPTION 'Staff member does not have active access to this business';
  END IF;

  IF NEW.assigned_by IS NOT NULL
    AND NOT public.can_manage_staff_loyalty_program_assignments(NEW.business_id, NEW.assigned_by)
  THEN
    RAISE EXCEPTION 'Assigned by user is not authorized for this business';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_staff_loyalty_program_assignments_validate
ON public.staff_loyalty_program_assignments;

CREATE TRIGGER trg_staff_loyalty_program_assignments_validate
BEFORE INSERT OR UPDATE
ON public.staff_loyalty_program_assignments
FOR EACH ROW
EXECUTE FUNCTION public.validate_staff_loyalty_program_assignment();

ALTER TABLE public.staff_loyalty_program_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments;

CREATE POLICY "read_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments
FOR SELECT
USING (
  public.can_manage_staff_loyalty_program_assignments(business_id, auth.uid())
  OR staff_user_id = auth.uid()
);

DROP POLICY IF EXISTS "insert_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments;

CREATE POLICY "insert_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments
FOR INSERT
WITH CHECK (
  public.can_manage_staff_loyalty_program_assignments(business_id, auth.uid())
);

DROP POLICY IF EXISTS "update_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments;

CREATE POLICY "update_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments
FOR UPDATE
USING (
  public.can_manage_staff_loyalty_program_assignments(business_id, auth.uid())
)
WITH CHECK (
  public.can_manage_staff_loyalty_program_assignments(business_id, auth.uid())
);

DROP POLICY IF EXISTS "delete_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments;

CREATE POLICY "delete_staff_loyalty_program_assignments"
ON public.staff_loyalty_program_assignments
FOR DELETE
USING (
  public.can_manage_staff_loyalty_program_assignments(business_id, auth.uid())
);