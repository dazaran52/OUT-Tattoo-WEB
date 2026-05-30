-- Migration: Add portfolio_url, own_referral_code, and referred_by to users
-- Provides required functionality for master verification and referral system

ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS own_referral_code VARCHAR(20) UNIQUE,
    ADD COLUMN IF NOT EXISTS referred_by VARCHAR(20);

-- Add comments for documentation
COMMENT ON COLUMN public.users.portfolio_url IS 'Mandatory link to Instagram or Portfolio';
COMMENT ON COLUMN public.users.own_referral_code IS 'Unique referral code for this master';
COMMENT ON COLUMN public.users.referred_by IS 'Referral code of the master who invited them';

-- Create an index on the own_referral_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(own_referral_code);
