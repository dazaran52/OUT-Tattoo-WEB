-- Migration: Create masters table for OUT Tattoo Leads
-- This table stores master profiles linked to Supabase Auth

CREATE TABLE IF NOT EXISTS public.masters (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE public.masters IS 'Tattoo masters profiles with credits balance';
COMMENT ON COLUMN public.masters.credits IS 'Internal currency: 1 Credit = 1 CZK';

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_masters_email ON public.masters(email);

-- Enable RLS (Row Level Security)
ALTER TABLE public.masters ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data
CREATE POLICY "Users can view own profile"
    ON public.masters
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can only update their own data
CREATE POLICY "Users can update own profile"
    ON public.masters
    FOR UPDATE
    USING (auth.uid() = id);

-- Policy: Allow insert during signup (handled by backend)
CREATE POLICY "Allow insert on signup"
    ON public.masters
    FOR INSERT
    WITH CHECK (auth.uid() = id);
