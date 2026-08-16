-- Create website_settings table
CREATE TABLE IF NOT EXISTS public.website_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Create Public Read policy
CREATE POLICY "Allow public read of settings" 
ON public.website_settings FOR SELECT 
USING (true);

-- Create Super Admin Manage policy
CREATE POLICY "Allow Super Admins to manage settings" 
ON public.website_settings FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.is_super_admin = true OR profiles.role = 'super_admin')
  )
);

-- Seed default footer settings
INSERT INTO public.website_settings (key, value)
VALUES (
  'footer',
  '{
    "aboutText": "The modern, production-ready digital loyalty platform designed specifically for the Caribbean market.",
    "copyrightText": "Aruba Royalty Stamp. All rights reserved."
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Regenerate TypeScript types for safety
SELECT 'Database adjustments completed' as status;