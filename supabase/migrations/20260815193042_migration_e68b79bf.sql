ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

UPDATE public.profiles 
SET is_super_admin = true, role = 'super_admin' 
WHERE email = '297plugins@gmail.com';