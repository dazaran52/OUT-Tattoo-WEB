-- Add discount_tokens to users
ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS discount_tokens INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.discount_tokens IS 'Number of 50% discount tokens earned from referrals';
