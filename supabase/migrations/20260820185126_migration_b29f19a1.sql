-- Allow public read access to active businesses so the join route can resolve the business_slug
DROP POLICY IF EXISTS "businesses_public_read_active" ON businesses;
CREATE POLICY "businesses_public_read_active" ON businesses FOR SELECT USING (status = 'active');

-- Allow public read access to active loyalty programs so the join route can display the QR loyalty card
DROP POLICY IF EXISTS "loyalty_programs_public_read_active" ON loyalty_programs;
CREATE POLICY "loyalty_programs_public_read_active" ON loyalty_programs FOR SELECT USING (active = true);