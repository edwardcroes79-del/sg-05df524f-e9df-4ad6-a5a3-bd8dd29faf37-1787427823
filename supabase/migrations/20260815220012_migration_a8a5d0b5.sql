-- Ensure loyalty-assets bucket exists in Supabase Storage for custom logo/bg uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('loyalty-assets', 'loyalty-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for storage bucket so authenticated users can upload and delete their own files
CREATE POLICY "Allow public select of loyalty assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'loyalty-assets');

CREATE POLICY "Allow authenticated insert/update of loyalty assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'loyalty-assets');

CREATE POLICY "Allow authenticated delete of loyalty assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'loyalty-assets');