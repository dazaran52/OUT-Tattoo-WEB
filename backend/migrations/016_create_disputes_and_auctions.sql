-- Migration: Create tables for Disputes and Auctions

-- 1. Disputes (Refund requests)
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    screenshots TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.disputes IS 'Requests from masters to return credits for a lead';

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create and view own disputes"
ON public.disputes FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all disputes"
ON public.disputes FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.is_admin = true));


-- 2. Auctions (Reselling leads)
CREATE TABLE IF NOT EXISTS public.auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT,
    expected_price TEXT,
    client_style TEXT,
    screenshots TEXT[] DEFAULT '{}',
    start_price INTEGER NOT NULL DEFAULT 10,
    current_price INTEGER NOT NULL DEFAULT 10,
    highest_bidder_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_bid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.auctions IS 'Auctions where masters resell leads they do not want';

-- Enable RLS
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active auctions"
ON public.auctions FOR SELECT USING (true);

CREATE POLICY "Users can create their own auctions"
ON public.auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update active auctions if they are the seller"
ON public.auctions FOR UPDATE USING (auth.uid() = seller_id);


-- 3. Auction Bids
CREATE TABLE IF NOT EXISTS public.auction_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bids"
ON public.auction_bids FOR SELECT USING (true);

CREATE POLICY "Users can place bids"
ON public.auction_bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);
