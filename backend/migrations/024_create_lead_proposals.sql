-- Migration: Create lead_proposals table and add priority to leads

-- 1. Add priority to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS client_priority VARCHAR(50) DEFAULT 'quality';

COMMENT ON COLUMN public.leads.client_priority IS 'Priority of the client: fast, cheap, or quality';

-- 2. Create lead_proposals table
CREATE TABLE IF NOT EXISTS public.lead_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    price_offer INTEGER NOT NULL,
    proposed_dates TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lead_id, user_id)
);

COMMENT ON TABLE public.lead_proposals IS 'Offers made by masters after unlocking a lead';

-- 3. Enable RLS
ALTER TABLE public.lead_proposals ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for lead_proposals
-- Masters can see their own proposals
CREATE POLICY "Users can view own proposals"
    ON public.lead_proposals
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Masters can create their own proposals
CREATE POLICY "Users can create own proposals"
    ON public.lead_proposals
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Everyone can view proposals for "cheap" priority leads (to see the lowest bid, backend masks other fields if necessary)
CREATE POLICY "Users can view proposals for cheap leads"
    ON public.lead_proposals
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.leads 
            WHERE id = lead_proposals.lead_id AND client_priority = 'cheap'
        )
    );
