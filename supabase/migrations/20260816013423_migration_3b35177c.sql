-- Create website_pages table
CREATE TABLE IF NOT EXISTS public.website_pages (
  slug text PRIMARY KEY,
  title text NOT NULL,
  content text,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Enable read access for all users" ON public.website_pages
  FOR SELECT USING (true);

-- Allow Super Admin full access (Insert, Update, Delete)
CREATE POLICY "Enable all access for super admins" ON public.website_pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'super_admin' OR profiles.is_super_admin = true)
    )
  );

-- Insert default rows if they don't exist
INSERT INTO public.website_pages (slug, title, content)
VALUES 
  ('privacy-policy', 'Privacy Policy', '<h2>Privacy Policy</h2><p>This is the default privacy policy. Please update this content in the Super Admin settings.</p>'),
  ('terms-of-service', 'Terms of Service', '<h2>Terms of Service</h2><p>This is the default terms of service. Please update this content in the Super Admin settings.</p>')
ON CONFLICT (slug) DO NOTHING;