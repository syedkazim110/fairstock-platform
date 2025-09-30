-- Update companies policies to allow board members to view companies
-- Drop the existing policy for viewing companies
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;

-- Create new policy that allows users to view companies they own OR are board members of
CREATE POLICY "Users can view their companies"
    ON public.companies FOR SELECT
    USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.company_members
            WHERE company_members.company_id = companies.id
            AND company_members.user_id = auth.uid()
            AND company_members.status = 'active'
        )
    );

-- Update company_members policies to allow viewing members of companies the user has access to
DROP POLICY IF EXISTS "Users can view company members" ON public.company_members;
CREATE POLICY "Users can view company members"
    ON public.company_members FOR SELECT
    USING (
        -- User can see their own memberships
        user_id = auth.uid()
        OR
        -- User can see members of companies they own
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE companies.id = company_members.company_id
            AND companies.owner_id = auth.uid()
        )
        OR
        -- User can see members of companies where they are active board members
        EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = company_members.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        )
    );
