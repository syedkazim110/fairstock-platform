-- Fix v2: Simpler approach to allow shareholders to view companies
-- Remove the recursive policy and use a direct user_id check

-- First, remove the problematic policy
DROP POLICY IF EXISTS "Shareholders can view companies where they have holdings" ON public.companies;

-- Add a simpler policy that checks user_id directly in the tables
-- This avoids the recursion issue
CREATE POLICY "Shareholders can view companies where they have holdings"
    ON public.companies FOR SELECT
    USING (
        -- Check if user_id matches in cap_table_entries (after linking)
        id IN (
            SELECT DISTINCT company_id 
            FROM public.cap_table_entries 
            WHERE user_id = auth.uid()
        )
        OR
        -- Check if user_id matches in equity_grants
        id IN (
            SELECT DISTINCT company_id 
            FROM public.equity_grants 
            WHERE user_id = auth.uid()
        )
        OR
        -- Check if user_id matches in convertible_instruments  
        id IN (
            SELECT DISTINCT company_id 
            FROM public.convertible_instruments 
            WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT ON public.companies TO postgres, anon, authenticated, service_role;
