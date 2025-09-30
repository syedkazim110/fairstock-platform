-- Migration to create missing profiles for existing users
-- Run this in your Supabase SQL Editor

-- Insert profiles for any auth users that don't have a profile yet
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', ''),
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Verify the trigger exists and is working
-- This recreates the trigger to ensure it's properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Check results: This should return the count of profiles
SELECT COUNT(*) as profile_count FROM public.profiles;

-- Done! All existing users should now have profiles.
