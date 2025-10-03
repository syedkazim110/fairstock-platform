-- Add signed_file_path column to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS signed_file_path TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_signed_file_path ON public.documents(signed_file_path) WHERE signed_file_path IS NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN public.documents.signed_file_path IS 'Path to the signed PDF with all signatures appended (created when all signatures are collected)';
