BEGIN;

DROP POLICY IF EXISTS business_locations_select_access ON public.business_locations;
CREATE POLICY business_locations_select_access
ON public.business_locations
FOR SELECT
USING (
  public.is_super_admin_user(auth.uid())
  OR public.is_corporate_admin_for_business(business_id)
  OR EXISTS (
    SELECT 1
    FROM public.business_user_locations bul
    JOIN public.business_users bu ON bu.id = bul.business_user_id
    WHERE bul.business_id = business_locations.business_id
      AND bul.location_id = business_locations.id
      AND bul.status = 'active'
      AND bu.business_id = business_locations.business_id
      AND bu.user_id = auth.uid()
      AND bu.status = 'active'
  )
);

DROP POLICY IF EXISTS business_user_locations_select_access ON public.business_user_locations;
CREATE POLICY business_user_locations_select_access
ON public.business_user_locations
FOR SELECT
USING (
  public.is_super_admin_user(auth.uid())
  OR public.is_corporate_admin_for_business(business_id)
  OR EXISTS (
    SELECT 1
    FROM public.business_users bu
    WHERE bu.id = business_user_locations.business_user_id
      AND bu.business_id = business_user_locations.business_id
      AND bu.user_id = auth.uid()
      AND bu.status = 'active'
  )
);

COMMIT;

select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.business_user_locations'::regclass, 'public.business_locations'::regclass)
order by conrelid::regclass::text, conname;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('business_locations', 'business_user_locations')
order by tablename, policyname;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('business_locations', 'business_user_locations')
order by tablename, indexname;