-- Drop existing policy that only allows owners to view companies
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;

-- Create new policy that allows both owners and board members to view companies
CREATE POLICY "Users can view companies they own or are members of"
    ON public.companies FOR SELECT
    USING (
        owner_id = auth.uid() 
        OR 
        EXISTS (
            SELECT 1 
            FROM public.company_members 
            WHERE company_members.company_id = companies.id 
            AND company_members.user_id = auth.uid()
            AND company_members.status = 'active'
        )
    );

-- Also update the company_members policy to allow viewing other members of companies you're a member of
DROP POLICY IF EXISTS "Users can view company members" ON public.company_members;

CREATE POLICY "Users can view company members"
    ON public.company_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 
            FROM public.companies 
            WHERE companies.id = company_members.company_id 
            AND companies.owner_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 
            FROM public.company_members cm2
            WHERE cm2.company_id = company_members.company_id 
            AND cm2.user_id = auth.uid()
            AND cm2.status = 'active'
        )
    );
