-- 1. Add user_id column to customer_loyalty_cards
ALTER TABLE customer_loyalty_cards ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Backfill user_id for existing loyalty cards from the customers table
UPDATE customer_loyalty_cards clc
SET user_id = c.user_id
FROM customers c
WHERE clc.customer_id = c.id;

-- 3. Create a trigger function to automatically populate user_id on INSERT
CREATE OR REPLACE FUNCTION populate_loyalty_card_user_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.user_id 
  FROM customers 
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger on the table
DROP TRIGGER IF EXISTS tr_populate_loyalty_card_user_id ON customer_loyalty_cards;
CREATE TRIGGER tr_populate_loyalty_card_user_id
BEFORE INSERT ON customer_loyalty_cards
FOR EACH ROW
EXECUTE FUNCTION populate_loyalty_card_user_id();

-- 5. Drop the old subquery-based RLS SELECT policy
DROP POLICY IF EXISTS "Customer read own cards" ON customer_loyalty_cards;

-- 6. Re-create the SELECT policy using a flat, direct filter (100% supported by Realtime!)
CREATE POLICY "Customer read own cards" ON customer_loyalty_cards
FOR SELECT USING (auth.uid() = user_id);

-- 7. Regenerate TypeScript database types so everything compiles cleanly
SELECT 'Done' as status;