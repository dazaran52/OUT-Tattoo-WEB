-- Migration: Create leads and lead_unlocks tables for OUT Tattoo Leads

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    contacts TEXT NOT NULL,
    price_credits INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


COMMENT ON TABLE public.leads IS 'Tattoo client requests available for purchase';
COMMENT ON COLUMN public.leads.contacts IS 'Hidden by backend until unlocked by the user';
COMMENT ON COLUMN public.leads.price_credits IS 'Cost to unlock this lead in Credits';

CREATE TABLE IF NOT EXISTS public.lead_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lead_id)
);

COMMENT ON TABLE public.lead_unlocks IS 'Record of which user unlocked which lead';

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_unlocks ENABLE ROW LEVEL SECURITY;

-- Policies for leads
-- Everyone authenticated can view leads (backend will mask the contacts)
CREATE POLICY "Users can view all leads"
    ON public.leads
    FOR SELECT
    TO authenticated
    USING (true);

-- Policies for lead_unlocks
-- Users can view their own unlocks
CREATE POLICY "Users can view own unlocks"
    ON public.lead_unlocks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own unlocks (backend validation handles credit deduction)
CREATE POLICY "Users can create own unlocks"
    ON public.lead_unlocks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
