-- Migration 013: Drop payment_requests and its storage bucket

-- Drop the table since we don't need manual Revolut approvals anymore
DROP TABLE IF EXISTS public.payment_requests;

-- Note: In Supabase, dropping a bucket can be complex via raw SQL due to references in objects. 
-- For safety, we only delete the table. The bucket can be left alone or manually deleted via the dashboard 
-- if no objects are inside it.
