-- Revert policies back to original working state
-- This will restore company visibility

-- Revert companies policy to original (simple) version
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
CREATE POLICY "Users can view their companies"
    ON public.companies FOR SELECT
    USING (owner_id = auth.uid());

-- Revert company_members policy to original version
DROP POLICY IF EXISTS "Users can view company members" ON public.company_members;
CREATE POLICY "Users can view company members"
    ON public.company_members FOR SELECT
    USING (user_id = auth.uid());
