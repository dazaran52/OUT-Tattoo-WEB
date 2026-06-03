-- Migration: Create email_lead_conversations table to track dialogue states and extracted fields.

CREATE TABLE IF NOT EXISTS public.email_lead_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_email VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    original_subject VARCHAR(255),
    thread_id VARCHAR(255), -- to group reply messages by thread
    state VARCHAR(50) DEFAULT 'initiated', -- 'initiated', 'active', 'completed', 'failed'
    collected_data JSONB DEFAULT '{
        "style": null,
        "location": null,
        "size": null,
        "budget": null,
        "images": []
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index to enforce a single active conversation per client email
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_conv_client_email ON public.email_lead_conversations(client_email) 
WHERE state IN ('initiated', 'active');

COMMENT ON TABLE public.email_lead_conversations IS 'Tracks active and historical AI email conversations to capture leads';
