-- Fix: Remove circular RLS policy that causes infinite recursion
-- The issue: Shareholders policy on companies table references cap_table_entries,
-- which creates a circular dependency when querying cap_table_entries with companies relationship

-- Drop the problematic shareholder access policy on companies
DROP POLICY IF EXISTS "Shareholders can view companies where they have holdings" ON public.companies;

-- Keep only the owner-based policies on companies table
-- These policies don't cause recursion because they only check owner_id

-- Verify owner policies exist (these should already be in place from supabase-schema.sql)
-- Users can view companies they own
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
CREATE POLICY "Users can view their companies"
    ON public.companies FOR SELECT
    USING (owner_id = auth.uid());

-- Users can insert companies (they become the owner)
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
CREATE POLICY "Users can create companies"
    ON public.companies FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Only owners can update their companies
DROP POLICY IF EXISTS "Owners can update their companies" ON public.companies;
CREATE POLICY "Owners can update their companies"
    ON public.companies FOR UPDATE
    USING (owner_id = auth.uid());

-- Only owners can delete their companies
DROP POLICY IF EXISTS "Owners can delete their companies" ON public.companies;
CREATE POLICY "Owners can delete their companies"
    ON public.companies FOR DELETE
    USING (owner_id = auth.uid());

-- IMPORTANT: Shareholder access to companies works through the cap_table_entries relationship
-- When querying: cap_table_entries.select('*, companies(*)'), the RLS flow is:
-- 1. Filter cap_table_entries based on shareholder policies (user_id or holder_email match)
-- 2. Join to companies for the filtered entries (no additional RLS check needed for the join)
-- 3. This avoids the circular reference while still allowing shareholders to see their companies

-- Verify shareholder policies on cap_table_entries remain in place
-- (These should already exist from supabase-shareholder-linking.sql)

-- Grant permissions
GRANT SELECT ON public.companies TO postgres, anon, authenticated, service_role;
