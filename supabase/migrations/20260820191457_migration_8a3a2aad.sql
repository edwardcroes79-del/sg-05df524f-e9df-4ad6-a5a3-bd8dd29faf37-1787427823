DROP POLICY IF EXISTS "businesses_public_read_active" ON businesses;
CREATE POLICY "businesses_public_read_active" ON businesses FOR SELECT USING (status IN ('active', 'trial') OR status IS NULL);