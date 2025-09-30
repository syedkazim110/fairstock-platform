-- Migration: Add shareholder linking functionality
-- This allows shareholders to see their holdings when they sign in

-- Step 1: Add user_id to cap_table_entries
ALTER TABLE public.cap_table_entries 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cap_table_entries_user_id ON public.cap_table_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_cap_table_entries_holder_email ON public.cap_table_entries(holder_email);

-- Step 2: Create function to link shareholders to users based on email
CREATE OR REPLACE FUNCTION public.link_shareholder_to_user()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new user signs up or profile is created, link any cap table entries with matching email
    UPDATE public.cap_table_entries
    SET user_id = NEW.id
    WHERE holder_email = NEW.email
    AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger to auto-link on profile creation
DROP TRIGGER IF EXISTS on_profile_created_link_shareholder ON public.profiles;
CREATE TRIGGER on_profile_created_link_shareholder
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.link_shareholder_to_user();

-- Step 4: Create trigger to auto-link on profile email update
DROP TRIGGER IF EXISTS on_profile_updated_link_shareholder ON public.profiles;
CREATE TRIGGER on_profile_updated_link_shareholder
    AFTER UPDATE OF email ON public.profiles
    FOR EACH ROW 
    WHEN (OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION public.link_shareholder_to_user();

-- Step 5: Link existing shareholders to existing users (one-time migration)
UPDATE public.cap_table_entries AS cte
SET user_id = p.id
FROM public.profiles AS p
WHERE cte.holder_email = p.email
AND cte.user_id IS NULL
AND cte.holder_email IS NOT NULL;

-- Step 6: Add RLS policy for shareholders to view their own holdings
DROP POLICY IF EXISTS "Shareholders can view their own holdings" ON public.cap_table_entries;
CREATE POLICY "Shareholders can view their own holdings"
    ON public.cap_table_entries FOR SELECT
    USING (
        -- Users can see entries where their user_id matches
        user_id = auth.uid()
        OR
        -- Or where their email matches (in case linking hasn't happened yet)
        holder_email IN (
            SELECT email FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Step 7: Add similar policies for equity_grants
ALTER TABLE public.equity_grants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_equity_grants_user_id ON public.equity_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_equity_grants_recipient_email ON public.equity_grants(recipient_email);

-- Function to link equity grants to users
CREATE OR REPLACE FUNCTION public.link_equity_grant_to_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.equity_grants
    SET user_id = NEW.id
    WHERE recipient_email = NEW.email
    AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_link_equity_grant ON public.profiles;
CREATE TRIGGER on_profile_created_link_equity_grant
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.link_equity_grant_to_user();

DROP TRIGGER IF EXISTS on_profile_updated_link_equity_grant ON public.profiles;
CREATE TRIGGER on_profile_updated_link_equity_grant
    AFTER UPDATE OF email ON public.profiles
    FOR EACH ROW 
    WHEN (OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION public.link_equity_grant_to_user();

-- Link existing equity grants
UPDATE public.equity_grants AS eg
SET user_id = p.id
FROM public.profiles AS p
WHERE eg.recipient_email = p.email
AND eg.user_id IS NULL
AND eg.recipient_email IS NOT NULL;

-- RLS policy for equity grants
DROP POLICY IF EXISTS "Grant recipients can view their own grants" ON public.equity_grants;
CREATE POLICY "Grant recipients can view their own grants"
    ON public.equity_grants FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        recipient_email IN (
            SELECT email FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Step 8: Add similar policies for convertible_instruments
ALTER TABLE public.convertible_instruments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_convertible_instruments_user_id ON public.convertible_instruments(user_id);
CREATE INDEX IF NOT EXISTS idx_convertible_instruments_investor_email ON public.convertible_instruments(investor_email);

CREATE OR REPLACE FUNCTION public.link_convertible_instrument_to_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.convertible_instruments
    SET user_id = NEW.id
    WHERE investor_email = NEW.email
    AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_link_convertible ON public.profiles;
CREATE TRIGGER on_profile_created_link_convertible
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.link_convertible_instrument_to_user();

DROP TRIGGER IF EXISTS on_profile_updated_link_convertible ON public.profiles;
CREATE TRIGGER on_profile_updated_link_convertible
    AFTER UPDATE OF email ON public.profiles
    FOR EACH ROW 
    WHEN (OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION public.link_convertible_instrument_to_user();

UPDATE public.convertible_instruments AS ci
SET user_id = p.id
FROM public.profiles AS p
WHERE ci.investor_email = p.email
AND ci.user_id IS NULL
AND ci.investor_email IS NOT NULL;

DROP POLICY IF EXISTS "Investors can view their own instruments" ON public.convertible_instruments;
CREATE POLICY "Investors can view their own instruments"
    ON public.convertible_instruments FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        investor_email IN (
            SELECT email FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON public.cap_table_entries TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.equity_grants TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.convertible_instruments TO postgres, anon, authenticated, service_role;
