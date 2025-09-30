-- Fix: Allow shareholders to view companies where they have holdings
-- This is needed so the companies relationship loads in the dashboard query

-- Add RLS policy for shareholders to view companies they have holdings in
DROP POLICY IF EXISTS "Shareholders can view companies where they have holdings" ON public.companies;
CREATE POLICY "Shareholders can view companies where they have holdings"
    ON public.companies FOR SELECT
    USING (
        -- Allow if user has cap table entries in this company
        EXISTS (
            SELECT 1 FROM public.cap_table_entries
            WHERE cap_table_entries.company_id = companies.id
            AND (
                cap_table_entries.user_id = auth.uid()
                OR cap_table_entries.holder_email IN (
                    SELECT email FROM public.profiles WHERE id = auth.uid()
                )
            )
        )
        OR
        -- Allow if user has equity grants in this company
        EXISTS (
            SELECT 1 FROM public.equity_grants
            WHERE equity_grants.company_id = companies.id
            AND (
                equity_grants.user_id = auth.uid()
                OR equity_grants.recipient_email IN (
                    SELECT email FROM public.profiles WHERE id = auth.uid()
                )
            )
        )
        OR
        -- Allow if user has convertible instruments in this company
        EXISTS (
            SELECT 1 FROM public.convertible_instruments
            WHERE convertible_instruments.company_id = companies.id
            AND (
                convertible_instruments.user_id = auth.uid()
                OR convertible_instruments.investor_email IN (
                    SELECT email FROM public.profiles WHERE id = auth.uid()
                )
            )
        )
    );

-- Grant permissions
GRANT SELECT ON public.companies TO postgres, anon, authenticated, service_role;
