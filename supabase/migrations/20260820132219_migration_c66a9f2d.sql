-- 2. Grant Staff Read-Only access to their business's Loyalty Programs
DROP POLICY IF EXISTS "loyalty_programs_staff_read" ON loyalty_programs;
CREATE POLICY "loyalty_programs_staff_read" ON loyalty_programs
FOR SELECT USING (
  public.is_active_staff_of(business_id, auth.uid())
);

-- 3. Ensure users can read their own business membership safely without recursion
DROP POLICY IF EXISTS "users_read_own_membership" ON business_users;
CREATE POLICY "users_read_own_membership" ON business_users
FOR SELECT USING (user_id = auth.uid());