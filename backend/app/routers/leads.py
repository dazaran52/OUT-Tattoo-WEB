from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client
from typing import List, Optional
import datetime

router = APIRouter(prefix="/api/leads", tags=["leads"])

class LeadResponse(BaseModel):
    id: str
    title: str
    description: str
    contacts: str
    price_credits: int
    is_unlocked: bool
    image_urls: List[str] = []
    created_at: str | None = None
    country_id: str | None = None
    city_id: str | None = None

class UnlockResponse(BaseModel):
    contacts: str
    is_unlocked: bool
    current_credits: int

@router.get("", response_model=List[LeadResponse])
async def get_leads(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get all leads. Contacts are masked if the user hasn't unlocked them.
    """
    try:
        # Fetch all leads
        leads_res = supabase.table("leads").select("*").order("created_at", desc=True).execute()
        leads = leads_res.data or []

        # Fetch unlocks for the current user
        unlocks_res = supabase.table("lead_unlocks") \
            .select("lead_id") \
            .eq("user_id", current_user.user_id) \
            .execute()
        
        unlocked_lead_ids = {u["lead_id"] for u in (unlocks_res.data or [])}

        # Fetch active auctions to hide contacts
        auctions_res = supabase.table("auctions") \
            .select("lead_id") \
            .eq("status", "active") \
            .execute()
        auction_lead_ids = {a["lead_id"] for a in (auctions_res.data or [])}

        processed_leads = []
        for lead in leads:
            is_unlocked = lead["id"] in unlocked_lead_ids
            
            # Hide contacts if lead is currently on auction, even if unlocked
            if lead["id"] in auction_lead_ids:
                contact_info = "******** [Лид на аукционе]"
            else:
                contact_info = lead["contacts"] if is_unlocked else "******** [Skryto. Odemkněte za credits]"
                
            processed_leads.append(LeadResponse(
                id=lead["id"],
                title=lead["title"],
                description=lead["description"],
                contacts=contact_info,
                price_credits=lead["price_credits"],
                is_unlocked=is_unlocked,
                image_urls=lead.get("image_urls", []),
                created_at=lead.get("created_at"),
                country_id=lead.get("country_id"),
                city_id=lead.get("city_id")
            ))
            
        return processed_leads

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching leads: {str(e)}"
        )


@router.post("/{lead_id}/unlock", response_model=UnlockResponse)
async def unlock_lead(
    lead_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Unlock a lead by deducting credits.
    """
    try:
        # Check if already unlocked
        unlock_check = supabase.table("lead_unlocks") \
            .select("id") \
            .eq("user_id", current_user.user_id) \
            .eq("lead_id", lead_id) \
            .execute()
            
        # Get lead
        lead_res = supabase.table("leads").select("*").eq("id", lead_id).single().execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found.")
        
        lead = lead_res.data
        
        # Get user
        user_res = supabase.table("users").select("*").eq("id", current_user.user_id).single().execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User profile not found.")
            
        user = user_res.data

        if unlock_check.data and len(unlock_check.data) > 0:
            # Already unlocked
            return UnlockResponse(
                contacts=lead["contacts"],
                is_unlocked=True,
                current_credits=user["credits"]
            )

        price_to_pay = lead["price_credits"]
        tokens_to_deduct = 0
        
        if user.get("discount_tokens", 0) > 0:
            price_to_pay = max(1, price_to_pay // 2)
            tokens_to_deduct = 1

        if user["credits"] < price_to_pay:
            raise HTTPException(
                status_code=400,
                detail="INSUFFICIENT_CREDITS"
            )

        # Deduct credits
        new_credits = user["credits"] - price_to_pay
        new_tokens = user.get("discount_tokens", 0) - tokens_to_deduct
        
        update_res = supabase.table("users") \
            .update({"credits": new_credits, "discount_tokens": new_tokens}) \
            .eq("id", current_user.user_id) \
            .execute()

        # Add unlock record
        supabase.table("lead_unlocks").insert({
            "user_id": current_user.user_id,
            "lead_id": lead_id
        }).execute()

        return UnlockResponse(
            contacts=lead["contacts"],
            is_unlocked=True,
            current_credits=new_credits
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error unlocking lead: {str(e)}"
        )
