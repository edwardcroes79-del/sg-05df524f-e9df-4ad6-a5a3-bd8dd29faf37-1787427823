CREATE OR REPLACE FUNCTION public.is_super_admin_user(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND (p.is_super_admin = true OR p.role = 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_business(p_business_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin_user(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = p_business_id
        AND b.owner_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.business_users bu
      WHERE bu.business_id = p_business_id
        AND bu.user_id = p_user_id
        AND bu.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_customer(p_customer_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin_user(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = p_customer_id
        AND c.user_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.customer_loyalty_cards clc
      WHERE clc.customer_id = p_customer_id
        AND public.can_access_business(clc.business_id, p_user_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin_user(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_business(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_customer(uuid, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self_business_super_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_self_business_super_admin"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR public.is_super_admin_user()
  OR EXISTS (
    SELECT 1
    FROM public.business_users target
    WHERE target.user_id = profiles.id
      AND public.can_access_business(target.business_id)
  )
);

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Public read customers" ON public.customers;
DROP POLICY IF EXISTS "Users manage own customer profile" ON public.customers;
DROP POLICY IF EXISTS "Super admin manage all customers" ON public.customers;
DROP POLICY IF EXISTS "customers_select_authorized" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
DROP POLICY IF EXISTS "customers_update_own_or_super_admin" ON public.customers;

CREATE POLICY "customers_select_authorized"
ON public.customers
FOR SELECT
USING (public.can_access_customer(id));

CREATE POLICY "customers_insert_own"
ON public.customers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_update_own_or_super_admin"
ON public.customers
FOR UPDATE
USING (auth.uid() = user_id OR public.is_super_admin_user())
WITH CHECK (auth.uid() = user_id OR public.is_super_admin_user());

DROP POLICY IF EXISTS "Users can add themselves to businesses" ON public.business_users;
DROP POLICY IF EXISTS "Business owners manage staff" ON public.business_users;
DROP POLICY IF EXISTS "Users view own business relationships and owners view staff" ON public.business_users;
DROP POLICY IF EXISTS "business_users_select_authorized" ON public.business_users;
DROP POLICY IF EXISTS "business_users_insert_owner_or_super_admin" ON public.business_users;
DROP POLICY IF EXISTS "business_users_update_owner_or_super_admin" ON public.business_users;
DROP POLICY IF EXISTS "business_users_delete_owner_or_super_admin" ON public.business_users;

CREATE POLICY "business_users_select_authorized"
ON public.business_users
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.can_access_business(business_id)
);

CREATE POLICY "business_users_insert_owner_or_super_admin"
ON public.business_users
FOR INSERT
WITH CHECK (
  public.is_super_admin_user()
  OR EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = business_id
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "business_users_update_owner_or_super_admin"
ON public.business_users
FOR UPDATE
USING (
  public.is_super_admin_user()
  OR EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = business_id
      AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  public.is_super_admin_user()
  OR EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = business_id
      AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "business_users_delete_owner_or_super_admin"
ON public.business_users
FOR DELETE
USING (
  public.is_super_admin_user()
  OR EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = business_id
      AND b.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Public can create loyalty cards" ON public.customer_loyalty_cards;
DROP POLICY IF EXISTS "Business owners manage cards" ON public.customer_loyalty_cards;
DROP POLICY IF EXISTS "Super admin manage all cards" ON public.customer_loyalty_cards;
DROP POLICY IF EXISTS "Customer read own cards" ON public.customer_loyalty_cards;
DROP POLICY IF EXISTS "customer_cards_select_authorized" ON public.customer_loyalty_cards;
DROP POLICY IF EXISTS "customer_cards_insert_authorized_consistent" ON public.customer_loyalty_cards;
DROP POLICY IF EXISTS "customer_cards_update_business_authorized" ON public.customer_loyalty_cards;

CREATE POLICY "customer_cards_select_authorized"
ON public.customer_loyalty_cards
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.can_access_business(business_id)
);

CREATE POLICY "customer_cards_insert_authorized_consistent"
ON public.customer_loyalty_cards
FOR INSERT
WITH CHECK (
  (
    (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1
        FROM public.customers c
        WHERE c.id = customer_id
          AND c.user_id = auth.uid()
      )
    )
    OR public.can_access_business(business_id)
  )
  AND EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = loyalty_program_id
      AND lp.business_id = business_id
  )
);

CREATE POLICY "customer_cards_update_business_authorized"
ON public.customer_loyalty_cards
FOR UPDATE
USING (public.can_access_business(business_id))
WITH CHECK (
  public.can_access_business(business_id)
  AND EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = loyalty_program_id
      AND lp.business_id = business_id
  )
);

DROP POLICY IF EXISTS "Business owners manage transactions" ON public.stamp_transactions;
DROP POLICY IF EXISTS "Super admin manage all transactions" ON public.stamp_transactions;
DROP POLICY IF EXISTS "stamp_transactions_select_authorized" ON public.stamp_transactions;
DROP POLICY IF EXISTS "stamp_transactions_insert_business_authorized_consistent" ON public.stamp_transactions;

CREATE POLICY "stamp_transactions_select_authorized"
ON public.stamp_transactions
FOR SELECT
USING (
  public.can_access_business(business_id)
  OR EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = stamp_transactions.customer_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "stamp_transactions_insert_business_authorized_consistent"
ON public.stamp_transactions
FOR INSERT
WITH CHECK (
  public.can_access_business(business_id)
  AND staff_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.customer_loyalty_cards clc
    WHERE clc.id = loyalty_card_id
      AND clc.customer_id = stamp_transactions.customer_id
      AND clc.business_id = stamp_transactions.business_id
      AND clc.loyalty_program_id = stamp_transactions.loyalty_program_id
  )
);

DROP POLICY IF EXISTS "Business owners manage rewards" ON public.rewards;
DROP POLICY IF EXISTS "Super admin manage all rewards" ON public.rewards;
DROP POLICY IF EXISTS "Customer read own rewards" ON public.rewards;
DROP POLICY IF EXISTS "rewards_select_authorized" ON public.rewards;
DROP POLICY IF EXISTS "rewards_insert_business_authorized_consistent" ON public.rewards;
DROP POLICY IF EXISTS "rewards_update_business_authorized_consistent" ON public.rewards;

CREATE POLICY "rewards_select_authorized"
ON public.rewards
FOR SELECT
USING (
  public.can_access_business(business_id)
  OR auth.uid() = user_id
);

CREATE POLICY "rewards_insert_business_authorized_consistent"
ON public.rewards
FOR INSERT
WITH CHECK (
  public.can_access_business(business_id)
  AND EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = customer_id
      AND c.user_id = rewards.user_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = loyalty_program_id
      AND lp.business_id = rewards.business_id
  )
);

CREATE POLICY "rewards_update_business_authorized_consistent"
ON public.rewards
FOR UPDATE
USING (public.can_access_business(business_id))
WITH CHECK (
  public.can_access_business(business_id)
  AND EXISTS (
    SELECT 1
    FROM public.customers c
    WHERE c.id = customer_id
      AND c.user_id = rewards.user_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.loyalty_programs lp
    WHERE lp.id = loyalty_program_id
      AND lp.business_id = rewards.business_id
  )
);