-- 1. Create a safe, non-recursive Ownership checker
CREATE OR REPLACE FUNCTION public.check_business_ownership(b_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM businesses WHERE id = b_id AND owner_id = u_id
  );
END;
$$;

-- 2. Drop existing RLS policies on loyalty_programs to clear the slate
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'loyalty_programs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON loyalty_programs', pol.policyname);
  END LOOP;
END
$$;

-- 3. Re-create robust policies for loyalty_programs
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_programs_owner_all" ON loyalty_programs
FOR ALL USING (
  public.check_business_ownership(business_id, auth.uid())
);

CREATE POLICY "loyalty_programs_public_read" ON loyalty_programs
FOR SELECT USING (
  true
);