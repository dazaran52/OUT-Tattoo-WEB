-- Migration: Fix Critical RLS vulnerabilities (004_fix_rls)

-- DROP insecure policy that allowed any user to see all lead contacts
-- (Backend uses SERVICE_ROLE key to bypass RLS, so clients don't need this policy)
DROP POLICY IF EXISTS "Users can view all leads" ON public.leads;

-- DROP insecure policy that allowed users to manually insert unlock records without paying
DROP POLICY IF EXISTS "Users can create own unlocks" ON public.lead_unlocks;

-- Ensure that Row Level Security is still enabled, but defaults to DENY for these actions
-- (Users will still be able to view their own unlocks due to the remaining policy "Users can view own unlocks")
