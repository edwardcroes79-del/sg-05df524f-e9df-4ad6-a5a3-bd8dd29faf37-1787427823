alter policy customer_cards_insert_authorized_consistent
on public.customer_loyalty_cards
with check (
  (
    (
      auth.uid() = user_id
      and exists (
        select 1
        from public.customers c
        where c.id = customer_loyalty_cards.customer_id
          and c.user_id = auth.uid()
      )
    )
    or public.can_access_business(business_id)
  )
  and exists (
    select 1
    from public.loyalty_programs lp
    where lp.id = customer_loyalty_cards.loyalty_program_id
      and lp.business_id = customer_loyalty_cards.business_id
  )
);

alter policy customer_cards_update_business_authorized
on public.customer_loyalty_cards
with check (
  public.can_access_business(business_id)
  and exists (
    select 1
    from public.loyalty_programs lp
    where lp.id = customer_loyalty_cards.loyalty_program_id
      and lp.business_id = customer_loyalty_cards.business_id
  )
);