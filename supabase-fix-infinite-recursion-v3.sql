-- Fix v3: Use SECURITY DEFINER function to break RLS recursion
-- The function bypasses RLS checks, preventing circular dependencies

-- Create a security definer function that checks if user has holdings in a company
CREATE OR REPLACE FUNCTION public.user_has_holdings_in_company(company_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_holdings BOOLEAN;
    user_email TEXT;
BEGIN
    -- Get user's email
    SELECT email INTO user_email FROM public.profiles WHERE id = user_uuid;
    
    -- Check if user has any holdings in this company
    SELECT EXISTS (
        -- Check cap_table_entries
        SELECT 1 FROM public.cap_table_entries
        WHERE company_id = company_uuid
        AND (user_id = user_uuid OR holder_email = user_email)
        
        UNION
        
        -- Check equity_grants
        SELECT 1 FROM public.equity_grants
        WHERE company_id = company_uuid
        AND (user_id = user_uuid OR recipient_email = user_email)
        
        UNION
        
        -- Check convertible_instruments
        SELECT 1 FROM public.convertible_instruments
        WHERE company_id = company_uuid
        AND (user_id = user_uuid OR investor_email = user_email)
    ) INTO has_holdings;
    
    RETURN COALESCE(has_holdings, FALSE);
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Shareholders can view companies where they have holdings" ON public.companies;
DROP POLICY IF EXISTS "Shareholders can view their companies" ON public.companies;

-- Recreate owner policies (these are safe)
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
CREATE POLICY "Users can view their companies"
    ON public.companies FOR SELECT
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
CREATE POLICY "Users can create companies"
    ON public.companies FOR INSERT
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their companies" ON public.companies;
CREATE POLICY "Owners can update their companies"
    ON public.companies FOR UPDATE
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete their companies" ON public.companies;
CREATE POLICY "Owners can delete their companies"
    ON public.companies FOR DELETE
    USING (owner_id = auth.uid());

-- Add shareholder policy using the SECURITY DEFINER function
-- This avoids recursion because the function bypasses RLS
CREATE POLICY "Shareholders can view their companies"
    ON public.companies FOR SELECT
    USING (
        public.user_has_holdings_in_company(id, auth.uid())
    );

-- Grant permissions
GRANT SELECT ON public.companies TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_holdings_in_company TO postgres, anon, authenticated, service_role;
