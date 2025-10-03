-- Phase 1: Enhance schema for Step 4 - Securities Offering Configuration
-- This migration adds fields needed for proper fundraising round configuration

-- 1. Add fields to companies table for share structure
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS authorized_shares DECIMAL(20, 4) DEFAULT 10000000,
ADD COLUMN IF NOT EXISTS share_calculation_method TEXT 
  DEFAULT 'fully_diluted' 
  CHECK (share_calculation_method IN ('issued_outstanding', 'fully_diluted'));

-- Add comments for clarity
COMMENT ON COLUMN public.companies.authorized_shares IS 'Total number of shares authorized in articles of incorporation';
COMMENT ON COLUMN public.companies.share_calculation_method IS 'Method for calculating share price: issued_outstanding or fully_diluted';

-- 2. Enhance fundraising_rounds table with Step 4 fields
ALTER TABLE public.fundraising_rounds 
ADD COLUMN IF NOT EXISTS security_type TEXT 
  DEFAULT 'common_stock'
  CHECK (security_type IN ('common_stock', 'preferred_stock')),
ADD COLUMN IF NOT EXISTS minimum_amount DECIMAL(20, 2),
ADD COLUMN IF NOT EXISTS maximum_amount DECIMAL(20, 2),
ADD COLUMN IF NOT EXISTS option_pool_increase DECIMAL(20, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_ownership_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS calculated_price_per_share DECIMAL(20, 4);

-- Add comments
COMMENT ON COLUMN public.fundraising_rounds.security_type IS 'Type of security being offered: common_stock or preferred_stock';
COMMENT ON COLUMN public.fundraising_rounds.minimum_amount IS 'Minimum amount below which offering will be abandoned';
COMMENT ON COLUMN public.fundraising_rounds.maximum_amount IS 'Maximum amount beyond which no more funds will be accepted';
COMMENT ON COLUMN public.fundraising_rounds.option_pool_increase IS 'Number of shares to add to option pool as part of this round';
COMMENT ON COLUMN public.fundraising_rounds.target_ownership_percentage IS 'Target post-money ownership percentage for this round';
COMMENT ON COLUMN public.fundraising_rounds.calculated_price_per_share IS 'Calculated price per share based on valuation and share count method';

-- 3. Update existing companies to have default authorized shares if NULL
UPDATE public.companies 
SET authorized_shares = 10000000 
WHERE authorized_shares IS NULL;

-- 4. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_share_calculation_method 
ON public.companies(share_calculation_method);
