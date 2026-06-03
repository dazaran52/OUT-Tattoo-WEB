-- Migration: Add Trust Score and Unlock Status

-- 1. Add trust_score to leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.leads.trust_score IS 'Algorithmically calculated score of how trustworthy this lead is (0-100)';

-- 2. Add status to lead_unlocks for master feedback
ALTER TABLE public.lead_unlocks 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'new';

-- valid statuses: 'new', 'contacted', 'no_answer', 'fake', 'appointment_set', 'came'
COMMENT ON COLUMN public.lead_unlocks.status IS 'Status set by the master who unlocked the lead';

-- Update RLS for lead_unlocks to allow users to update their own unlock status
DROP POLICY IF EXISTS "Users can update own unlocks" ON public.lead_unlocks;
CREATE POLICY "Users can update own unlocks"
    ON public.lead_unlocks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
