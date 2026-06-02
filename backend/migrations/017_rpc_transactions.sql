-- Migration: Add RPC functions for atomic transactions

-- 1. RPC to Unlock Lead Atomically
CREATE OR REPLACE FUNCTION unlock_lead(p_user_id UUID, p_lead_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lead record;
    v_user record;
    v_price_to_pay int;
    v_tokens_to_deduct int := 0;
BEGIN
    -- Check if already unlocked
    IF EXISTS (SELECT 1 FROM lead_unlocks WHERE user_id = p_user_id AND lead_id = p_lead_id) THEN
        RETURN json_build_object('success', true, 'message', 'Already unlocked', 'contacts', (SELECT contacts FROM leads WHERE id = p_lead_id));
    END IF;

    -- Get lead
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found';
    END IF;

    -- Get user
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    v_price_to_pay := v_lead.price_credits;
    
    IF COALESCE(v_user.discount_tokens, 0) > 0 THEN
        v_price_to_pay := GREATEST(1, v_price_to_pay / 2);
        v_tokens_to_deduct := 1;
    END IF;

    IF v_user.credits < v_price_to_pay THEN
        RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
    END IF;

    -- Deduct credits
    UPDATE users 
    SET credits = credits - v_price_to_pay,
        discount_tokens = COALESCE(discount_tokens, 0) - v_tokens_to_deduct
    WHERE id = p_user_id;

    -- Add unlock record
    INSERT INTO lead_unlocks (user_id, lead_id) VALUES (p_user_id, p_lead_id);

    RETURN json_build_object(
        'success', true, 
        'new_credits', v_user.credits - v_price_to_pay,
        'contacts', v_lead.contacts
    );
END;
$$;

-- 2. RPC to Place Bid Atomically
CREATE OR REPLACE FUNCTION place_bid(p_user_id UUID, p_auction_id UUID, p_bid_amount INTEGER)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auction record;
    v_user record;
    v_prev_user record;
    v_cost int;
    v_is_self_outbid boolean;
    v_new_ends_at timestamp with time zone;
BEGIN
    -- Get auction with FOR UPDATE to lock the row and prevent race conditions
    SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction not found';
    END IF;

    IF v_auction.status != 'active' THEN
        RAISE EXCEPTION 'Auction is no longer active';
    END IF;

    IF v_auction.seller_id = p_user_id THEN
        RAISE EXCEPTION 'You cannot bid on your own auction';
    END IF;

    IF p_bid_amount <= v_auction.current_price THEN
        RAISE EXCEPTION 'Bid must be higher than current price';
    END IF;

    -- Get user
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    v_is_self_outbid := (v_auction.highest_bidder_id = p_user_id);
    IF v_is_self_outbid THEN
        v_cost := p_bid_amount - v_auction.current_price;
    ELSE
        v_cost := p_bid_amount;
    END IF;

    IF v_user.credits < v_cost THEN
        RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
    END IF;

    -- Refund previous bidder if it's someone else
    IF v_auction.highest_bidder_id IS NOT NULL AND NOT v_is_self_outbid THEN
        UPDATE users 
        SET credits = credits + v_auction.current_price
        WHERE id = v_auction.highest_bidder_id;
        
        -- Insert notification for previous bidder
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
            v_auction.highest_bidder_id,
            'Ваша ставка перебита',
            'Ваша ставка ' || v_auction.current_price || ' кредитов на аукционе была перебита. Кредиты возвращены на баланс.',
            'system'
        );
    END IF;

    -- Deduct cost from new bidder
    UPDATE users SET credits = credits - v_cost WHERE id = p_user_id;

    -- Update auction
    v_new_ends_at := v_auction.ends_at;
    IF (v_auction.ends_at - NOW()) < interval '1 hour' THEN
        v_new_ends_at := NOW() + interval '1 hour';
    END IF;

    UPDATE auctions 
    SET current_price = p_bid_amount,
        highest_bidder_id = p_user_id,
        last_bid_at = NOW(),
        ends_at = v_new_ends_at
    WHERE id = p_auction_id;

    -- Record bid
    INSERT INTO auction_bids (auction_id, bidder_id, amount)
    VALUES (p_auction_id, p_user_id, p_bid_amount);

    RETURN json_build_object(
        'success', true,
        'current_price', p_bid_amount,
        'new_credits', v_user.credits - v_cost
    );
END;
$$;
