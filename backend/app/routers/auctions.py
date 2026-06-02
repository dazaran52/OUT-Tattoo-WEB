from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/auctions", tags=["auctions"])

class AuctionCreate(BaseModel):
    lead_id: str
    reason: str
    expected_price: str
    client_style: str
    screenshots: List[str] = []
    start_price: int = 10

class AuctionBid(BaseModel):
    amount: int

@router.post("")
async def create_auction(
    auction: AuctionCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Master lists an unlocked lead in the auction.
    """
    try:
        # Verify unlock
        unlock_res = supabase.table("lead_unlocks") \
            .select("id") \
            .eq("user_id", current_user.user_id) \
            .eq("lead_id", auction.lead_id) \
            .execute()
            
        if not unlock_res.data:
            raise HTTPException(status_code=400, detail="You have not unlocked this lead.")
            
        # Ensure not already in auction
        existing = supabase.table("auctions") \
            .select("id") \
            .eq("lead_id", auction.lead_id) \
            .eq("status", "active") \
            .execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Lead is already in an active auction.")

        # Create auction lasting max 4 hours
        ends_at = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()

        res = supabase.table("auctions").insert({
            "lead_id": auction.lead_id,
            "seller_id": current_user.user_id,
            "reason": auction.reason,
            "expected_price": auction.expected_price,
            "client_style": auction.client_style,
            "screenshots": auction.screenshots,
            "start_price": auction.start_price,
            "current_price": auction.start_price,
            "ends_at": ends_at
        }).execute()

        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create auction.")

        return res.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("")
async def get_active_auctions(supabase: Client = Depends(get_supabase_client)):
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # 1. Process expired auctions lazily
        expired_res = supabase.table("auctions") \
            .select("*") \
            .eq("status", "active") \
            .lt("ends_at", now_iso) \
            .execute()
            
        for exp_auction in (expired_res.data or []):
            # Atomic update to prevent race conditions
            update_res = supabase.table("auctions").update({"status": "completed"}).eq("id", exp_auction["id"]).eq("status", "active").execute()
            if update_res.data:
                winner_id = exp_auction.get("highest_bidder_id")
                seller_id = exp_auction.get("seller_id")
                final_price = exp_auction.get("current_price")
                
                if winner_id:
                    # Grant lead to winner
                    supabase.table("lead_unlocks").insert({
                        "user_id": winner_id,
                        "lead_id": exp_auction["lead_id"],
                        "price_paid": final_price
                    }).execute()
                    
                    # Notify winner
                    supabase.table("notifications").insert({
                        "user_id": winner_id,
                        "title": "Вы выиграли аукцион!",
                        "message": f"Поздравляем! Вы выиграли аукцион за {final_price} кредитов. Лид теперь в разделе 'Мои лиды'.",
                        "type": "system"
                    }).execute()
                    
                    # Grant credits to seller (80% of final price for example, or 100%)
                    seller_res = supabase.table("users").select("credits").eq("id", seller_id).single().execute()
                    if seller_res.data:
                        # Let's give 100% to seller for now
                        supabase.table("users").update({"credits": seller_res.data["credits"] + final_price}).eq("id", seller_id).execute()
                        
                    # Notify seller
                    supabase.table("notifications").insert({
                        "user_id": seller_id,
                        "title": "Аукцион завершен",
                        "message": f"Ваш лид был продан за {final_price} кредитов. Кредиты зачислены на баланс.",
                        "type": "system"
                    }).execute()
                else:
                    # No bids
                    supabase.table("notifications").insert({
                        "user_id": seller_id,
                        "title": "Аукцион завершен (без ставок)",
                        "message": f"Ваш аукцион завершился, но никто не сделал ставку.",
                        "type": "system"
                    }).execute()

        # 2. Get active auctions
        res = supabase.table("auctions") \
            .select("*, leads(title, description, price_credits, image_url)") \
            .eq("status", "active") \
            .gte("ends_at", now_iso) \
            .order("ends_at", desc=False) \
            .execute()
            
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{auction_id}/bid")
async def place_bid(
    auction_id: str,
    bid: AuctionBid,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Place a bid on an active auction.
    """
    try:
        # Get auction
        auction_res = supabase.table("auctions").select("*").eq("id", auction_id).single().execute()
        if not auction_res.data:
            raise HTTPException(status_code=404, detail="Auction not found")
            
        auction = auction_res.data
        if auction["status"] != "active":
            raise HTTPException(status_code=400, detail="Auction is no longer active.")
            
        if auction["seller_id"] == current_user.user_id:
            raise HTTPException(status_code=400, detail="You cannot bid on your own auction.")
            
        if bid.amount <= auction["current_price"]:
            raise HTTPException(status_code=400, detail="Bid must be higher than current price.")

        # Check user credits taking into account if they are outbidding themselves
        user_res = supabase.table("users").select("credits").eq("id", current_user.user_id).single().execute()
        if not user_res.data:
            raise HTTPException(status_code=400, detail="User not found")
            
        is_self_outbid = (auction.get("highest_bidder_id") == current_user.user_id)
        cost = bid.amount - auction["current_price"] if is_self_outbid else bid.amount
        
        if user_res.data["credits"] < cost:
            raise HTTPException(status_code=400, detail="INSUFFICIENT_CREDITS")
            
        # Refund previous bidder if it's someone else
        if auction["highest_bidder_id"] and not is_self_outbid:
            prev_bidder_id = auction["highest_bidder_id"]
            prev_bid = auction["current_price"]
            
            # Add credits back to prev bidder
            prev_user_res = supabase.table("users").select("credits").eq("id", prev_bidder_id).single().execute()
            if prev_user_res.data:
                supabase.table("users") \
                    .update({"credits": prev_user_res.data["credits"] + prev_bid}) \
                    .eq("id", prev_bidder_id) \
                    .execute()
                    
                # Notify prev bidder
                supabase.table("notifications").insert({
                    "user_id": prev_bidder_id,
                    "title": "Ваша ставка перебита",
                    "message": f"Ваша ставка {prev_bid} кредитов на аукционе была перебита. Кредиты возвращены на баланс.",
                    "type": "system"
                }).execute()

        # Deduct cost from new bidder
        new_credits = user_res.data["credits"] - cost
        supabase.table("users").update({"credits": new_credits}).eq("id", current_user.user_id).execute()

        # Update auction: Extend by 1 hour (auto-end rule 1-1.5 hours) if ends_at is soon
        now = datetime.now(timezone.utc)
        ends_at = datetime.fromisoformat(auction["ends_at"].replace("Z", "+00:00"))
        if (ends_at - now) < timedelta(hours=1):
            ends_at = now + timedelta(hours=1)
            
        supabase.table("auctions").update({
            "current_price": bid.amount,
            "highest_bidder_id": current_user.user_id,
            "last_bid_at": now.isoformat(),
            "ends_at": ends_at.isoformat()
        }).eq("id", auction_id).execute()
        
        # Record bid
        supabase.table("auction_bids").insert({
            "auction_id": auction_id,
            "bidder_id": current_user.user_id,
            "amount": bid.amount
        }).execute()
        
        return {"message": "Bid placed successfully", "current_price": bid.amount}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
