-- Fix RLS policy to allow company owners to view all members of their companies
-- This fixes the issue where board members don't appear in the document signature selection

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view company members" ON public.company_members;

-- Create new policy that allows:
-- 1. Users to view their own memberships
-- 2. Company owners to view ALL members of companies they own
CREATE POLICY "Users can view company members"
    ON public.company_members FOR SELECT
    USING (
        user_id = auth.uid() 
        OR company_id IN (
            SELECT id FROM public.companies WHERE owner_id = auth.uid()
        )
    );

-- Additionally, ensure owners can see members when querying with joins
-- This policy allows viewing member records for companies the user owns or is a member of
DROP POLICY IF EXISTS "Members can view other company members" ON public.company_members;
CREATE POLICY "Members can view other company members"
    ON public.company_members FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.company_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );
