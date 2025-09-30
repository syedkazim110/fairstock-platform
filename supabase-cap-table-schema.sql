-- Cap Table Schema for FairStock Platform
-- This schema handles all equity ownership tracking, grants, transactions, and modeling

-- Cap Table Entries - Main ownership records
CREATE TABLE IF NOT EXISTS public.cap_table_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    holder_name TEXT NOT NULL,
    holder_email TEXT,
    holder_type TEXT NOT NULL CHECK (holder_type IN ('founder', 'employee', 'investor', 'advisor', 'other')),
    equity_type TEXT NOT NULL CHECK (equity_type IN ('common_stock', 'preferred_stock', 'safe', 'convertible_note', 'option')),
    shares DECIMAL(20, 4) DEFAULT 0,
    price_per_share DECIMAL(20, 4),
    total_value DECIMAL(20, 2),
    issue_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL
);

-- Equity Grants - Track option grants and vesting
CREATE TABLE IF NOT EXISTS public.equity_grants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT,
    grant_date DATE NOT NULL,
    total_shares DECIMAL(20, 4) NOT NULL,
    vested_shares DECIMAL(20, 4) DEFAULT 0,
    exercised_shares DECIMAL(20, 4) DEFAULT 0,
    cancelled_shares DECIMAL(20, 4) DEFAULT 0,
    vesting_start_date DATE,
    vesting_duration_months INTEGER DEFAULT 48,
    cliff_months INTEGER DEFAULT 12,
    exercise_price DECIMAL(20, 4),
    expiration_date DATE,
    grant_type TEXT NOT NULL CHECK (grant_type IN ('ISO', 'NSO', 'RSU', 'RSA')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'fully_exercised', 'expired')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL
);

-- Equity Transactions - Complete history of equity movements
CREATE TABLE IF NOT EXISTS public.equity_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('issuance', 'transfer', 'repurchase', 'exercise', 'cancellation', 'conversion')),
    transaction_date DATE NOT NULL,
    from_holder TEXT,
    to_holder TEXT NOT NULL,
    equity_type TEXT NOT NULL CHECK (equity_type IN ('common_stock', 'preferred_stock', 'safe', 'convertible_note', 'option')),
    shares DECIMAL(20, 4) NOT NULL,
    price_per_share DECIMAL(20, 4),
    total_amount DECIMAL(20, 2),
    related_grant_id UUID REFERENCES public.equity_grants(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL
);

-- Convertible Instruments - SAFEs and convertible notes
CREATE TABLE IF NOT EXISTS public.convertible_instruments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    investor_name TEXT NOT NULL,
    investor_email TEXT,
    instrument_type TEXT NOT NULL CHECK (instrument_type IN ('SAFE', 'convertible_note')),
    principal_amount DECIMAL(20, 2) NOT NULL,
    discount_rate DECIMAL(5, 2),
    valuation_cap DECIMAL(20, 2),
    interest_rate DECIMAL(5, 2),
    issue_date DATE NOT NULL,
    maturity_date DATE,
    conversion_trigger TEXT,
    status TEXT DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'converted', 'repaid', 'expired')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL
);

-- Fundraising Rounds - Track company valuations and rounds
CREATE TABLE IF NOT EXISTS public.fundraising_rounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    round_name TEXT NOT NULL,
    round_type TEXT NOT NULL CHECK (round_type IN ('seed', 'series_a', 'series_b', 'series_c', 'series_d', 'bridge', 'other')),
    close_date DATE NOT NULL,
    valuation_pre_money DECIMAL(20, 2),
    valuation_post_money DECIMAL(20, 2),
    amount_raised DECIMAL(20, 2) NOT NULL,
    shares_issued DECIMAL(20, 4),
    price_per_share DECIMAL(20, 4),
    lead_investor TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL
);

-- Option Pool - Track option pool size and allocations
CREATE TABLE IF NOT EXISTS public.option_pools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    pool_name TEXT NOT NULL,
    total_shares DECIMAL(20, 4) NOT NULL,
    granted_shares DECIMAL(20, 4) DEFAULT 0,
    available_shares DECIMAL(20, 4) NOT NULL,
    created_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cap_table_entries_company_id ON public.cap_table_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_cap_table_entries_holder_type ON public.cap_table_entries(holder_type);
CREATE INDEX IF NOT EXISTS idx_equity_grants_company_id ON public.equity_grants(company_id);
CREATE INDEX IF NOT EXISTS idx_equity_grants_status ON public.equity_grants(status);
CREATE INDEX IF NOT EXISTS idx_equity_transactions_company_id ON public.equity_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_equity_transactions_date ON public.equity_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_convertible_instruments_company_id ON public.convertible_instruments(company_id);
CREATE INDEX IF NOT EXISTS idx_convertible_instruments_status ON public.convertible_instruments(status);
CREATE INDEX IF NOT EXISTS idx_fundraising_rounds_company_id ON public.fundraising_rounds(company_id);
CREATE INDEX IF NOT EXISTS idx_option_pools_company_id ON public.option_pools(company_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at_cap_table_entries ON public.cap_table_entries;
CREATE TRIGGER set_updated_at_cap_table_entries
    BEFORE UPDATE ON public.cap_table_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_equity_grants ON public.equity_grants;
CREATE TRIGGER set_updated_at_equity_grants
    BEFORE UPDATE ON public.equity_grants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_convertible_instruments ON public.convertible_instruments;
CREATE TRIGGER set_updated_at_convertible_instruments
    BEFORE UPDATE ON public.convertible_instruments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_fundraising_rounds ON public.fundraising_rounds;
CREATE TRIGGER set_updated_at_fundraising_rounds
    BEFORE UPDATE ON public.fundraising_rounds
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_option_pools ON public.option_pools;
CREATE TRIGGER set_updated_at_option_pools
    BEFORE UPDATE ON public.option_pools
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.cap_table_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equity_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equity_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convertible_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraising_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_pools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cap_table_entries
-- Owners can do everything, board members can only view
DROP POLICY IF EXISTS "Company owners can manage cap table entries" ON public.cap_table_entries;
CREATE POLICY "Company owners can manage cap table entries"
    ON public.cap_table_entries FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE companies.id = cap_table_entries.company_id
            AND companies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Board members can view cap table entries" ON public.cap_table_entries;
CREATE POLICY "Board members can view cap table entries"
    ON public.cap_table_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_members
            WHERE company_members.company_id = cap_table_entries.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'board_member'
            AND company_members.status = 'active'
        )
    );

-- RLS Policies for equity_grants
DROP POLICY IF EXISTS "Company owners can manage equity grants" ON public.equity_grants;
CREATE POLICY "Company owners can manage equity grants"
    ON public.equity_grants FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE companies.id = equity_grants.company_id
            AND companies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Board members can view equity grants" ON public.equity_grants;
CREATE POLICY "Board members can view equity grants"
    ON public.equity_grants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_members
            WHERE company_members.company_id = equity_grants.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'board_member'
            AND company_members.status = 'active'
        )
    );

-- RLS Policies for equity_transactions
DROP POLICY IF EXISTS "Company owners can manage equity transactions" ON public.equity_transactions;
CREATE POLICY "Company owners can manage equity transactions"
    ON public.equity_transactions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE companies.id = equity_transactions.company_id
            AND companies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Board members can view equity transactions" ON public.equity_transactions;
CREATE POLICY "Board members can view equity transactions"
    ON public.equity_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_members
            WHERE company_members.company_id = equity_transactions.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'board_member'
            AND company_members.status = 'active'
        )
    );

-- RLS Policies for convertible_instruments
DROP POLICY IF EXISTS "Company owners can manage convertible instruments" ON public.convertible_instruments;
CREATE POLICY "Company owners can manage convertible instruments"
    ON public.convertible_instruments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE companies.id = convertible_instruments.company_id
            AND companies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Board members can view convertible instruments" ON public.convertible_instruments;
CREATE POLICY "Board members can view convertible instruments"
    ON public.convertible_instruments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_members
            WHERE company_members.company_id = convertible_instruments.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'board_member'
            AND company_members.status = 'active'
        )
    );

-- RLS Policies for fundraising_rounds
DROP POLICY IF EXISTS "Company owners can manage fundraising rounds" ON public.fundraising_rounds;
CREATE POLICY "Company owners can manage fundraising rounds"
    ON public.fundraising_rounds FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE companies.id = fundraising_rounds.company_id
            AND companies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Board members can view fundraising rounds" ON public.fundraising_rounds;
CREATE POLICY "Board members can view fundraising rounds"
    ON public.fundraising_rounds FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_members
            WHERE company_members.company_id = fundraising_rounds.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'board_member'
            AND company_members.status = 'active'
        )
    );

-- RLS Policies for option_pools
DROP POLICY IF EXISTS "Company owners can manage option pools" ON public.option_pools;
CREATE POLICY "Company owners can manage option pools"
    ON public.option_pools FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE companies.id = option_pools.company_id
            AND companies.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Board members can view option pools" ON public.option_pools;
CREATE POLICY "Board members can view option pools"
    ON public.option_pools FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.company_members
            WHERE company_members.company_id = option_pools.company_id
            AND company_members.user_id = auth.uid()
            AND company_members.role = 'board_member'
            AND company_members.status = 'active'
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.cap_table_entries TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.equity_grants TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.equity_transactions TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.convertible_instruments TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.fundraising_rounds TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.option_pools TO postgres, anon, authenticated, service_role;
