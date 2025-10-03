-- Fix storage bucket policies to allow service role to upload signed PDFs
-- Run this in your Supabase SQL Editor OR via Supabase Dashboard

-- Method 1: Using Supabase Dashboard (RECOMMENDED - EASIER)
-- Go to: Storage → documents bucket → Policies tab
-- Click "New Policy" and add the following policies:

-- Policy 1: "Allow authenticated uploads for signed PDFs"
--   Operation: INSERT
--   Target roles: authenticated
--   WITH CHECK expression:
--   (bucket_id = 'documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM companies) AND name LIKE '%-signed.pdf')

-- Policy 2: "Allow authenticated reads for signed PDFs"
--   Operation: SELECT  
--   Target roles: authenticated
--   USING expression:
--   (bucket_id = 'documents' AND (storage.foldername(name))[1] IN (SELECT c.id::text FROM companies c LEFT JOIN company_members cm ON c.id = cm.company_id WHERE c.owner_id = auth.uid() OR cm.user_id = auth.uid()))


-- Method 2: Using SQL (if Method 1 doesn't work)
-- Note: Storage policies in Supabase use storage.objects table

-- First check existing policies (optional)
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated to upload signed PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to read signed PDFs" ON storage.objects;

-- Add policy to allow authenticated users to upload signed PDFs
CREATE POLICY "Allow authenticated to upload signed PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies
  )
  AND name LIKE '%-signed.pdf'
);

-- Add policy to allow authenticated users to read signed PDFs
CREATE POLICY "Allow authenticated to read signed PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text 
    FROM companies c
    LEFT JOIN company_members cm ON c.id = cm.company_id
    WHERE c.owner_id = auth.uid() OR cm.user_id = auth.uid()
  )
);

-- Verify policies were created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%signed%';
