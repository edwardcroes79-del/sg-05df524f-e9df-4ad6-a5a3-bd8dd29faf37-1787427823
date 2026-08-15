-- Ensure 297plugins@gmail.com always gets the super_admin role and is_super_admin flag
CREATE OR REPLACE FUNCTION public.handle_super_admin_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = '297plugins@gmail.com' THEN
    NEW.is_super_admin := true;
    NEW.role := 'super_admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_super_admin_profile ON public.profiles;
CREATE TRIGGER ensure_super_admin_profile
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_super_admin_assignment();

-- Update existing profile if it already exists
UPDATE public.profiles
SET is_super_admin = true, role = 'super_admin'
WHERE email = '297plugins@gmail.com';