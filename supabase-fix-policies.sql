-- Migration to fix infinite recursion in RLS policies
-- Run this in your Supabase SQL Editor

-- Drop and recreate companies policies to remove circular dependency
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
CREATE POLICY "Users can view their companies"
    ON public.companies FOR SELECT
    USING (owner_id = auth.uid());

-- Drop and recreate company_members policies to remove circular dependency
DROP POLICY IF EXISTS "Users can view company members" ON public.company_members;
CREATE POLICY "Users can view company members"
    ON public.company_members FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can invite members" ON public.company_members;
CREATE POLICY "Owners can invite members"
    ON public.company_members FOR INSERT
    WITH CHECK (invited_by = auth.uid());

DROP POLICY IF EXISTS "Owners and users can update members" ON public.company_members;
CREATE POLICY "Owners and users can update members"
    ON public.company_members FOR UPDATE
    USING (invited_by = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can remove members" ON public.company_members;
CREATE POLICY "Owners can remove members"
    ON public.company_members FOR DELETE
    USING (invited_by = auth.uid());

-- Done! The infinite recursion issue should be resolved.
