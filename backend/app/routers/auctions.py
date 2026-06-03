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
        
        # Get active auctions
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
        # Pre-fetch auction details for notifications
        auction_res = supabase.table("auctions").select("highest_bidder_id, seller_id").eq("id", auction_id).execute()
        prev_highest = auction_res.data[0].get("highest_bidder_id") if auction_res.data else None
        seller_id = auction_res.data[0].get("seller_id") if auction_res.data else None
        
        # Call the atomic RPC function
        try:
            rpc_res = supabase.rpc(
                "place_bid",
                {
                    "p_user_id": current_user.user_id,
                    "p_auction_id": auction_id,
                    "p_bid_amount": bid.amount
                }
            ).execute()
        except Exception as e:
            err_str = str(e)
            if "Auction is no longer active" in err_str:
                raise HTTPException(status_code=400, detail="Auction is no longer active.")
            if "You cannot bid on your own auction" in err_str:
                raise HTTPException(status_code=400, detail="You cannot bid on your own auction.")
            if "Bid must be higher than current price" in err_str:
                raise HTTPException(status_code=400, detail="Bid must be higher than current price.")
            if "INSUFFICIENT_CREDITS" in err_str:
                raise HTTPException(status_code=400, detail="INSUFFICIENT_CREDITS")
            raise HTTPException(status_code=400, detail=err_str)
            
        data = rpc_res.data
        if not data or not data.get("success"):
            raise HTTPException(status_code=400, detail="Failed to place bid")
            
        # Send push notifications
        from app.services.notifications import send_push_notification
        
        if prev_highest and prev_highest != current_user.user_id:
            try:
                send_push_notification(
                    user_id=prev_highest,
                    title="Ваша ставка перебита! ⚡",
                    body=f"Кто-то предложил {bid.amount} кредитов. Сделайте новую ставку, чтобы не упустить лид!",
                    url="/dashboard"
                )
            except Exception as e:
                print(f"Push to prev bidder failed: {e}")
                
        if seller_id and seller_id != current_user.user_id:
            try:
                send_push_notification(
                    user_id=seller_id,
                    title="Новая ставка на аукционе! 🎉",
                    body=f"Кто-то предложил {bid.amount} кредитов за ваш лид.",
                    url="/dashboard"
                )
            except Exception as e:
                print(f"Push to seller failed: {e}")
            
        return {"message": "Bid placed successfully", "current_price": data.get("current_price", bid.amount)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
