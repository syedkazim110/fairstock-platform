-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket

-- Policy: Company members can view documents for their company
CREATE POLICY "Company members can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM company_members 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
);

-- Policy: Company owners can upload documents
CREATE POLICY "Company owners can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM companies 
    WHERE owner_id = auth.uid()
  )
);

-- Policy: Company owners can delete documents
CREATE POLICY "Company owners can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM companies 
    WHERE owner_id = auth.uid()
  )
);

-- Note: Run this SQL in your Supabase SQL Editor after running the main schema
