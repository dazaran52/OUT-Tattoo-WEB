-- Create Countries table
CREATE TABLE IF NOT EXISTS public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ru TEXT NOT NULL,
    name_en TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Cities table
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
    name_ru TEXT NOT NULL,
    name_en TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Location filtering fields to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS country_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS city_ids UUID[] DEFAULT '{}';

-- Add city_id to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Policies for countries
CREATE POLICY "Countries are viewable by everyone" 
ON public.countries FOR SELECT USING (true);

CREATE POLICY "Countries can only be managed by admins" 
ON public.countries FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

-- Policies for cities
CREATE POLICY "Cities are viewable by everyone" 
ON public.cities FOR SELECT USING (true);

CREATE POLICY "Cities can only be managed by admins" 
ON public.cities FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

-- Insert some default data for testing
INSERT INTO public.countries (code, name_ru, name_en)
VALUES 
('DE', 'Германия', 'Germany'),
('PL', 'Польша', 'Poland'),
('CZ', 'Чехия', 'Czech Republic')
ON CONFLICT (code) DO NOTHING;

-- Note: We can't insert cities easily without knowing the country UUIDs dynamically here,
-- but we'll do it via API or a separate script later.
