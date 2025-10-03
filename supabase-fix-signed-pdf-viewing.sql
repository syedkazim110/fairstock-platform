-- Fix for signed PDF viewing issues
-- This script addresses two problems:
-- 1. Updates any documents that have signed_file_path but are still marked as 'pending'
-- 2. Ensures storage RLS policies allow viewing signed PDFs

-- ===== PART 1: Fix existing documents with signed PDFs =====
-- Update any documents that have a signed_file_path but status is not 'fully_signed'
UPDATE documents
SET status = 'fully_signed'
WHERE signed_file_path IS NOT NULL 
  AND status != 'fully_signed';

-- Verify the fix
SELECT 
  id, 
  title, 
  status, 
  signed_file_path,
  file_path
FROM documents
WHERE signed_file_path IS NOT NULL;

-- ===== PART 2: Fix storage RLS policies for signed PDFs =====

-- First, check existing policies on storage.objects
-- (Run this to see what policies exist)
SELECT 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Allow authenticated to upload signed PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to read signed PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role to upload signed PDFs" ON storage.objects;

-- Create policy to allow authenticated users to read signed PDFs for their companies
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
  AND name LIKE '%-signed.pdf'
);

-- Create policy to allow service role to upload signed PDFs (for server-side generation)
-- Note: Service role bypasses RLS by default, but we add this for completeness
CREATE POLICY "Allow service role to upload signed PDFs"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'documents'
  AND name LIKE '%-signed.pdf'
);

-- Also ensure authenticated users can read ALL documents in their companies
-- (not just signed ones - this is for the original PDFs)
DROP POLICY IF EXISTS "Allow authenticated to read company documents" ON storage.objects;

CREATE POLICY "Allow authenticated to read company documents"
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

-- Verify the new policies were created
SELECT 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (policyname LIKE '%signed%' OR policyname LIKE '%company documents%')
ORDER BY policyname;

-- ===== VERIFICATION QUERIES =====

-- Check if any documents still need status updates
SELECT 
  COUNT(*) as documents_with_signed_pdf_but_wrong_status
FROM documents
WHERE signed_file_path IS NOT NULL 
  AND status != 'fully_signed';

-- List all documents with their signature status
SELECT 
  d.id,
  d.title,
  d.status,
  d.signed_file_path IS NOT NULL as has_signed_pdf,
  COUNT(ds.id) as total_signatures,
  COUNT(ds.id) FILTER (WHERE ds.status = 'signed') as signed_count,
  COUNT(ds.id) FILTER (WHERE ds.status = 'pending') as pending_count
FROM documents d
LEFT JOIN document_signatures ds ON d.id = ds.document_id
GROUP BY d.id, d.title, d.status, d.signed_file_path
ORDER BY d.created_at DESC;
