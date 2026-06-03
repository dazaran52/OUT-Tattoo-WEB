-- Migration: Add withdrawable_credits and withdrawal_requests

-- 1. Add withdrawable_credits to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS withdrawable_credits INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.users.withdrawable_credits IS 'Credits earned from selling leads on auction that can be withdrawn';

-- 2. Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    payment_details TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE public.withdrawal_requests IS 'Requests from masters to withdraw earned credits to real money';

-- 3. RLS for withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawal requests"
    ON public.withdrawal_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawal requests"
    ON public.withdrawal_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests"
    ON public.withdrawal_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

CREATE POLICY "Admins can update withdrawal requests"
    ON public.withdrawal_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );
