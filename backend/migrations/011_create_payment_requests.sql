-- Migration 011: Create payment_requests table

CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount_credits INTEGER NOT NULL,
    provider TEXT NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    screenshot_url TEXT,
    admin_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Admins can see all payment_requests
CREATE POLICY "Admins can view all payment_requests"
    ON public.payment_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Admins can update payment_requests
CREATE POLICY "Admins can update payment_requests"
    ON public.payment_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Users can view their own payment_requests
CREATE POLICY "Users can view their own payment_requests"
    ON public.payment_requests FOR SELECT
    USING ( auth.uid() = user_id );

-- Service role can do everything
CREATE POLICY "Service role can manage payment_requests"
    ON public.payment_requests FOR ALL
    USING ( true )
    WITH CHECK ( true );
