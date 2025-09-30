-- Fix v2: Allow shareholders to view companies without infinite recursion
-- The key is to check if the company_id exists in the tables where user has access,
-- but using the company's ID directly (not re-querying the companies table)

-- Drop the problematic shareholder access policy if it exists
DROP POLICY IF EXISTS "Shareholders can view companies where they have holdings" ON public.companies;

-- Recreate owner policies (these are safe and don't cause recursion)
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

-- Add shareholder access policy using LATERAL approach to avoid recursion
-- The trick: Check if companies.id exists in cap_table_entries WHERE the user has access
-- This doesn't create recursion because we're checking companies.id (not doing a reverse lookup)
DROP POLICY IF EXISTS "Shareholders can view their companies" ON public.companies;
CREATE POLICY "Shareholders can view their companies"
    ON public.companies FOR SELECT
    USING (
        -- Allow if this company's ID appears in cap_table_entries where user has access
        id IN (
            SELECT company_id 
            FROM public.cap_table_entries
            WHERE user_id = auth.uid()
               OR holder_email IN (SELECT email FROM public.profiles WHERE id = auth.uid())
        )
        OR
        -- Allow if this company's ID appears in equity_grants where user has access
        id IN (
            SELECT company_id 
            FROM public.equity_grants
            WHERE user_id = auth.uid()
               OR recipient_email IN (SELECT email FROM public.profiles WHERE id = auth.uid())
        )
        OR
        -- Allow if this company's ID appears in convertible_instruments where user has access
        id IN (
            SELECT company_id 
            FROM public.convertible_instruments
            WHERE user_id = auth.uid()
               OR investor_email IN (SELECT email FROM public.profiles WHERE id = auth.uid())
        )
    );

-- Grant permissions
GRANT SELECT ON public.companies TO postgres, anon, authenticated, service_role;
