-- Migration: Add image_urls to leads table

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.leads.image_urls IS 'Array of public Supabase storage URLs for photos attached to the lead';
