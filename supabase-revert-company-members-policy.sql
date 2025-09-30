-- REVERT SCRIPT: Restore original company_members RLS policy
-- Run this to undo the changes from supabase-fix-company-members-visibility.sql

-- Drop the new policies we created
DROP POLICY IF EXISTS "Users can view company members" ON public.company_members;
DROP POLICY IF EXISTS "Members can view other company members" ON public.company_members;

-- Restore the ORIGINAL policy from your schema
CREATE POLICY "Users can view company members"
    ON public.company_members FOR SELECT
    USING (
        user_id = auth.uid()
    );
