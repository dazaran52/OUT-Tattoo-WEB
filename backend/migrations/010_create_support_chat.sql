-- Migration 010: Create support_messages table and enable realtime

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view all messages"
    ON public.support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

CREATE POLICY "Admins can insert messages"
    ON public.support_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

CREATE POLICY "Admins can update messages"
    ON public.support_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Users can view their own messages
CREATE POLICY "Users can view their own messages"
    ON public.support_messages FOR SELECT
    USING ( auth.uid() = user_id );

-- Users can insert messages for themselves
CREATE POLICY "Users can insert their own messages"
    ON public.support_messages FOR INSERT
    WITH CHECK ( auth.uid() = user_id AND auth.uid() = sender_id );

-- Enable Realtime for the table
-- If the publication exists, this adds the table. Supabase creates 'supabase_realtime' publication by default.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
  END IF;
END
$$;
