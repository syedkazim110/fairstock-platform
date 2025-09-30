-- E-Signature System Schema
-- This schema supports document upload, signature requests, and audit trails

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL, -- Path in Supabase Storage
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_signed', 'fully_signed', 'cancelled')),
    requires_all_signatures BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create document_signatures table
CREATE TABLE IF NOT EXISTS public.document_signatures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    board_member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined')),
    signature_data TEXT, -- Base64 encoded signature image
    signed_at TIMESTAMP WITH TIME ZONE,
    declined_at TIMESTAMP WITH TIME ZONE,
    decline_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(document_id, board_member_id)
);

-- Create document_audit_log table
CREATE TABLE IF NOT EXISTS public.document_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('uploaded', 'signature_requested', 'signed', 'declined', 'viewed', 'downloaded', 'cancelled')),
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id ON public.document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_board_member_id ON public.document_signatures(board_member_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_status ON public.document_signatures(status);
CREATE INDEX IF NOT EXISTS idx_document_audit_log_document_id ON public.document_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_document_audit_log_user_id ON public.document_audit_log(user_id);

-- Create trigger for updated_at on documents
DROP TRIGGER IF EXISTS set_updated_at_documents ON public.documents;
CREATE TRIGGER set_updated_at_documents
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;

-- Documents policies
-- Company owners and board members can view documents for their company
DROP POLICY IF EXISTS "Company members can view documents" ON public.documents;
CREATE POLICY "Company members can view documents"
    ON public.documents FOR SELECT
    USING (
        -- Company owner can always view
        company_id IN (
            SELECT id 
            FROM public.companies 
            WHERE owner_id = auth.uid()
        )
        OR
        -- Board members can view
        company_id IN (
            SELECT company_id 
            FROM public.company_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Only company owners can insert documents
DROP POLICY IF EXISTS "Company owners can upload documents" ON public.documents;
CREATE POLICY "Company owners can upload documents"
    ON public.documents FOR INSERT
    WITH CHECK (
        uploaded_by = auth.uid() AND
        company_id IN (
            SELECT id 
            FROM public.companies 
            WHERE owner_id = auth.uid()
        )
    );

-- Only company owners can update documents
DROP POLICY IF EXISTS "Company owners can update documents" ON public.documents;
CREATE POLICY "Company owners can update documents"
    ON public.documents FOR UPDATE
    USING (
        company_id IN (
            SELECT id 
            FROM public.companies 
            WHERE owner_id = auth.uid()
        )
    );

-- Only company owners can delete documents
DROP POLICY IF EXISTS "Company owners can delete documents" ON public.documents;
CREATE POLICY "Company owners can delete documents"
    ON public.documents FOR DELETE
    USING (
        company_id IN (
            SELECT id 
            FROM public.companies 
            WHERE owner_id = auth.uid()
        )
    );

-- Document signatures policies
-- Board members can view their own signature requests and company owners can view all
DROP POLICY IF EXISTS "Users can view relevant signatures" ON public.document_signatures;
CREATE POLICY "Users can view relevant signatures"
    ON public.document_signatures FOR SELECT
    USING (
        board_member_id = auth.uid() OR
        company_id IN (
            SELECT id 
            FROM public.companies 
            WHERE owner_id = auth.uid()
        )
    );

-- Only company owners can create signature requests
DROP POLICY IF EXISTS "Company owners can create signature requests" ON public.document_signatures;
CREATE POLICY "Company owners can create signature requests"
    ON public.document_signatures FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT id 
            FROM public.companies 
            WHERE owner_id = auth.uid()
        )
    );

-- Board members can update their own signatures
DROP POLICY IF EXISTS "Board members can sign documents" ON public.document_signatures;
CREATE POLICY "Board members can sign documents"
    ON public.document_signatures FOR UPDATE
    USING (board_member_id = auth.uid());

-- Document audit log policies
-- Users can view audit logs for documents they have access to
DROP POLICY IF EXISTS "Users can view audit logs" ON public.document_audit_log;
CREATE POLICY "Users can view audit logs"
    ON public.document_audit_log FOR SELECT
    USING (
        document_id IN (
            SELECT id 
            FROM public.documents 
            WHERE company_id IN (
                SELECT company_id 
                FROM public.company_members 
                WHERE user_id = auth.uid() 
                AND status = 'active'
            )
        )
    );

-- Anyone with document access can create audit log entries
DROP POLICY IF EXISTS "Users can create audit logs" ON public.document_audit_log;
CREATE POLICY "Users can create audit logs"
    ON public.document_audit_log FOR INSERT
    WITH CHECK (
        document_id IN (
            SELECT id 
            FROM public.documents 
            WHERE company_id IN (
                SELECT company_id 
                FROM public.company_members 
                WHERE user_id = auth.uid() 
                AND status = 'active'
            )
        )
    );

-- Function to update document status based on signatures
CREATE OR REPLACE FUNCTION public.update_document_signature_status()
RETURNS TRIGGER AS $$
DECLARE
    total_signatures INTEGER;
    signed_count INTEGER;
    doc_status TEXT;
BEGIN
    -- Count total signature requests for this document
    SELECT COUNT(*) INTO total_signatures
    FROM public.document_signatures
    WHERE document_id = NEW.document_id;

    -- Count signed signatures
    SELECT COUNT(*) INTO signed_count
    FROM public.document_signatures
    WHERE document_id = NEW.document_id AND status = 'signed';

    -- Determine new document status
    IF signed_count = 0 THEN
        doc_status := 'pending';
    ELSIF signed_count = total_signatures THEN
        doc_status := 'fully_signed';
    ELSE
        doc_status := 'partially_signed';
    END IF;

    -- Update document status
    UPDATE public.documents
    SET status = doc_status, updated_at = NOW()
    WHERE id = NEW.document_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update document status when signature changes
DROP TRIGGER IF EXISTS on_signature_change ON public.document_signatures;
CREATE TRIGGER on_signature_change
    AFTER INSERT OR UPDATE ON public.document_signatures
    FOR EACH ROW EXECUTE FUNCTION public.update_document_signature_status();

-- Grant necessary permissions
GRANT ALL ON public.documents TO postgres, authenticated, service_role;
GRANT ALL ON public.document_signatures TO postgres, authenticated, service_role;
GRANT ALL ON public.document_audit_log TO postgres, authenticated, service_role;
