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

        processed_leads = []
        for lead in leads:
            is_unlocked = lead["id"] in unlocked_lead_ids
            processed_leads.append(LeadResponse(
                id=lead["id"],
                title=lead["title"],
                description=lead["description"],
                contacts=lead["contacts"] if is_unlocked else "******** [Skryto. Odemkněte za credits]",
                price_credits=lead["price_credits"],
                is_unlocked=is_unlocked,
                image_urls=lead.get("image_urls", []),
                created_at=lead.get("created_at")
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

        if user["credits"] < lead["price_credits"]:
            raise HTTPException(
                status_code=400,
                detail=f"Nedostatek kreditů! K odemčení kontaktů potřebujete {lead['price_credits']} kreditů, váš aktuální zůstatek je {user['credits']} kreditů."
            )

        # Deduct credits
        new_credits = user["credits"] - lead["price_credits"]
        update_res = supabase.table("users") \
            .update({"credits": new_credits}) \
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
