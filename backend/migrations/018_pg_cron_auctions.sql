-- Migration: Add pg_cron job for automated auction closing

-- 1. Create the RPC function that processes expired auctions
CREATE OR REPLACE FUNCTION process_expired_auctions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auction record;
BEGIN
    FOR v_auction IN 
        SELECT * FROM auctions 
        WHERE status = 'active' AND ends_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Mark as completed
        UPDATE auctions SET status = 'completed' WHERE id = v_auction.id;
        
        IF v_auction.highest_bidder_id IS NOT NULL THEN
            -- Grant lead to winner
            INSERT INTO lead_unlocks (user_id, lead_id)
            VALUES (v_auction.highest_bidder_id, v_auction.lead_id)
            ON CONFLICT DO NOTHING;
            
            -- Notify winner
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                v_auction.highest_bidder_id,
                'Вы выиграли аукцион!',
                'Поздравляем! Вы выиграли аукцион за ' || v_auction.current_price || ' кредитов. Лид теперь в разделе "Мои лиды".',
                'system'
            );
            
            -- Grant credits to seller
            UPDATE users 
            SET credits = credits + v_auction.current_price
            WHERE id = v_auction.seller_id;
            
            -- Notify seller
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                v_auction.seller_id,
                'Аукцион завершен',
                'Ваш лид был продан за ' || v_auction.current_price || ' кредитов. Кредиты зачислены на баланс.',
                'system'
            );
        ELSE
            -- No bids
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                v_auction.seller_id,
                'Аукцион завершен (без ставок)',
                'Ваш аукцион завершился, но никто не сделал ставку.',
                'system'
            );
        END IF;
    END LOOP;
END;
$$;

-- 2. Try to enable pg_cron and schedule it (might require superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule first if exists to avoid duplicates
SELECT cron.unschedule('process-expired-auctions-every-minute');

-- Schedule the job to run every minute
SELECT cron.schedule(
    'process-expired-auctions-every-minute',
    '* * * * *',
    $$ SELECT process_expired_auctions(); $$
);
