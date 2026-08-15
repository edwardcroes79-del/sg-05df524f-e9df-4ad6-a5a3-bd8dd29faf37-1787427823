-- Enable Business Owners to view/manage customer loyalty cards for their business
CREATE POLICY "Business owners manage cards" ON public.customer_loyalty_cards
FOR ALL USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Enable Business Owners to view/manage stamp transactions for their business
CREATE POLICY "Business owners manage transactions" ON public.stamp_transactions
FOR ALL USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Enable Business Owners to view/manage rewards for their business
CREATE POLICY "Business owners manage rewards" ON public.rewards
FOR ALL USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);