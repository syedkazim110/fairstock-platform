-- Diagnostic script to troubleshoot missing company issue
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check your current user ID
SELECT 
    'Current User ID' as check_type,
    auth.uid() as user_id,
    auth.email() as user_email;

-- 2. Check all companies in the database
SELECT 
    'All Companies' as check_type,
    id as company_id,
    name as company_name,
    owner_id,
    created_at
FROM public.companies
ORDER BY created_at DESC;

-- 3. Check your profile
SELECT 
    'Your Profile' as check_type,
    id as profile_id,
    email,
    full_name
FROM public.profiles
WHERE id = auth.uid();

-- 4. Check if there's a mismatch between auth.users and profiles
SELECT 
    'Auth Users vs Profiles' as check_type,
    au.id as auth_user_id,
    au.email as auth_email,
    p.id as profile_id,
    p.email as profile_email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.id = auth.uid();

-- 5. Check companies owned by your user ID
SELECT 
    'Companies You Own' as check_type,
    c.id as company_id,
    c.name as company_name,
    c.owner_id,
    c.created_at,
    (c.owner_id = auth.uid()) as is_owner
FROM public.companies c
WHERE c.owner_id = auth.uid();

-- 6. Check company_members entries
SELECT 
    'Company Members' as check_type,
    cm.id,
    cm.company_id,
    cm.user_id,
    cm.role,
    cm.status,
    c.name as company_name
FROM public.company_members cm
LEFT JOIN public.companies c ON cm.company_id = c.id
WHERE cm.user_id = auth.uid();

-- 7. Test the RLS policy directly
SELECT 
    'RLS Policy Test' as check_type,
    c.id as company_id,
    c.name as company_name,
    c.owner_id,
    (c.owner_id = auth.uid()) as matches_owner_policy,
    EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_members.company_id = c.id
        AND company_members.user_id = auth.uid()
        AND company_members.status = 'active'
    ) as matches_member_policy
FROM public.companies c;
