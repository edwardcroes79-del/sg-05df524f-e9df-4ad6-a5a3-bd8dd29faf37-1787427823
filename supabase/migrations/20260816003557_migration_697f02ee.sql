-- 1. Guarantee no existing cards have NULL user_id (which blocks RLS)
UPDATE customer_loyalty_cards clc
SET user_id = c.user_id
FROM customers c
WHERE clc.customer_id = c.id AND clc.user_id IS NULL;

-- 2. Add user_id to rewards to allow Flat RLS (enabling Realtime)
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

UPDATE rewards r
SET user_id = c.user_id
FROM customers c
WHERE r.customer_id = c.id AND r.user_id IS NULL;

-- 3. Create Trigger to auto-populate rewards.user_id on INSERT
CREATE OR REPLACE FUNCTION set_rewards_user_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM customers WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_populate_rewards_user_id ON rewards;
CREATE TRIGGER tr_populate_rewards_user_id 
BEFORE INSERT ON rewards 
FOR EACH ROW 
EXECUTE FUNCTION set_rewards_user_id();

-- 4. Create Flat Policy for Rewards to unblock Realtime events
DROP POLICY IF EXISTS "Customer read own rewards" ON rewards;
CREATE POLICY "Customer read own rewards" ON rewards FOR SELECT USING (auth.uid() = user_id);

SELECT 'Diagnostic and database fixes successfully applied' as status;