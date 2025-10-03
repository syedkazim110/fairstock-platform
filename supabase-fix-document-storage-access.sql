-- Fix storage policy to allow both company owners and board members to view documents
-- This ensures that both the owner and board members can download/view document files

-- Drop the existing policy
DROP POLICY IF EXISTS "Company members can view documents" ON storage.objects;

-- Create updated policy that includes both owners and board members
CREATE POLICY "Company owners and members can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (
    -- Board members can view documents for their company
    (storage.foldername(name))[1] IN (
      SELECT company_id::text 
      FROM company_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
    OR
    -- Company owners can view documents for their company
    (storage.foldername(name))[1] IN (
      SELECT id::text 
      FROM companies 
      WHERE owner_id = auth.uid()
    )
  )
);
