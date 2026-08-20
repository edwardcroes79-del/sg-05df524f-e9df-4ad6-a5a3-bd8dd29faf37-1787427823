-- Safely drop the 1-argument function to eliminate the ambiguity.
-- Any calls passing 1 argument will now unambiguously route to the 
-- 2-argument function using its DEFAULT auth.uid() parameter.
DROP FUNCTION IF EXISTS public.can_access_business(uuid);