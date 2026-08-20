-- Allow staff to update cards (needed for stamp issuing if they use direct updates instead of RPC, though RPC bypasses this)
-- But just in case
CREATE POLICY "business_staff_cards_update" ON customer_loyalty_cards
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM business_users WHERE business_id = customer_loyalty_cards.business_id AND user_id = auth.uid() AND status = 'active'
  )
);