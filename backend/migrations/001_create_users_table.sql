-- Migration: Create users table for OUT Tattoo Leads
-- This table stores user profiles linked to Supabase Auth

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    credits INTEGER NOT NULL DEFAULT 0,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE public.users IS 'User profiles with credits balance';
COMMENT ON COLUMN public.users.credits IS 'Internal currency: 1 Credit = 1 CZK';
COMMENT ON COLUMN public.users.is_admin IS 'Admin flag for management access';

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data
CREATE POLICY "Users can view own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can only update their own data
CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Policy: Allow insert during signup (handled by backend)
CREATE POLICY "Allow insert on signup"
    ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);
