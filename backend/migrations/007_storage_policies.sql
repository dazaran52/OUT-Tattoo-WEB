-- Migration to add RLS policies to the lead_images bucket

-- Enable public read access to all files in the lead_images bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'lead_images' );

-- Enable authenticated users to upload files to the lead_images bucket
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'lead_images' );

-- Optional: Allow users to delete their own uploads
CREATE POLICY "Allow authenticated deletes" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( bucket_id = 'lead_images' );
