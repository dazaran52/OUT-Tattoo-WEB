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
    trust_score: int = 100
    unlock_status: str | None = None

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

        # Fetch ALL unlocks to enforce exclusivity
        all_unlocks_res = supabase.table("lead_unlocks").select("lead_id, user_id, status").execute()
        all_unlocks = all_unlocks_res.data or []
        
        unlocked_by_me = {u["lead_id"]: u["status"] for u in all_unlocks if u["user_id"] == current_user.user_id}
        unlocked_by_anyone = {u["lead_id"] for u in all_unlocks}

        # Fetch active auctions to hide contacts
        auctions_res = supabase.table("auctions") \
            .select("lead_id") \
            .eq("status", "active") \
            .execute()
        auction_lead_ids = {a["lead_id"] for a in (auctions_res.data or [])}

        processed_leads = []
        for lead in leads:
            is_unlocked = lead["id"] in unlocked_by_me
            
            # EXCLUSIVE LEADS: If someone else bought it, hide it completely.
            if lead["id"] in unlocked_by_anyone and not is_unlocked:
                continue
                
            unlock_status = unlocked_by_me.get(lead["id"]) if is_unlocked else None
            
            # Hide contacts if lead is currently on auction, even if unlocked
            if lead["id"] in auction_lead_ids:
                contact_info = "******** [Лид на аукционе]"
            else:
                contacts = lead["contacts"] if is_unlocked else "******** [Skryto. Odemkněte za credits]"
                
            processed_leads.append(LeadResponse(
                id=lead["id"],
                title=lead["title"],
                description=lead["description"],
                contacts=contacts,
                price_credits=lead["price_credits"],
                is_unlocked=is_unlocked,
                image_urls=lead.get("image_urls") or [],
                created_at=lead.get("created_at"),
                country_id=lead.get("country_id"),
                city_id=lead.get("city_id"),
                trust_score=lead.get("trust_score", 100),
                unlock_status=unlock_status
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
        
        # Call the atomic RPC function
        try:
            rpc_res = supabase.rpc(
                "unlock_lead",
                {"p_user_id": current_user.user_id, "p_lead_id": lead_id}
            ).execute()
        except Exception as e:
            if "INSUFFICIENT_CREDITS" in str(e):
                raise HTTPException(status_code=400, detail="INSUFFICIENT_CREDITS")
            elif "Already unlocked" in str(e):
                # We need to fetch contacts since RPC might just return the text
                pass
            raise HTTPException(status_code=400, detail=str(e))
            
        data = rpc_res.data
        if not data or not data.get("success"):
            raise HTTPException(status_code=400, detail="Failed to unlock lead")
            
        return UnlockResponse(
            contacts=data.get("contacts", "Hidden"),
            is_unlocked=True,
            current_credits=data.get("new_credits", 0)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error unlocking lead: {str(e)}"
        )


class LeadStatusUpdate(BaseModel):
    status: str

@router.patch("/{lead_id}/status")
async def update_lead_status(
    lead_id: str,
    payload: LeadStatusUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update lead status by the master who unlocked it."""
    valid_statuses = ['new', 'contacted', 'no_answer', 'fake', 'appointment_set', 'came']
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    try:
        # Update unlock status
        res = supabase.table("lead_unlocks") \
            .update({"status": payload.status}) \
            .eq("lead_id", lead_id) \
            .eq("user_id", current_user.user_id) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Unlock record not found")
            
        # Recalculate lead trust score
        unlocks_res = supabase.table("lead_unlocks").select("status").eq("lead_id", lead_id).execute()
        unlocks = unlocks_res.data or []
        
        base_score = 100
        for u in unlocks:
            s = u["status"]
            if s == "fake": base_score -= 50
            elif s == "no_answer": base_score -= 20
            elif s == "came": base_score += 50
            elif s == "appointment_set": base_score += 20
            
        final_score = max(0, min(100, base_score))
        
        supabase.table("leads").update({"trust_score": final_score}).eq("id", lead_id).execute()
        
        return {"success": True, "trust_score": final_score}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MasterLeadCreate(BaseModel):
    title: str
    description: str
    contacts: str
    city_id: str
    country_id: str
    price_credits: int = 50

@router.post("/master")
async def create_master_lead(
    lead_data: MasterLeadCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Allow a master to create their own lead (C2C)."""
    try:
        # Insert lead (exclude country_id as it doesn't exist in DB)
        data = lead_data.model_dump()
        data.pop("country_id", None)
        lead_insert = supabase.table("leads").insert(data).execute()
        if not lead_insert.data:
            raise HTTPException(status_code=400, detail="Failed to create lead")
            
        new_lead = lead_insert.data[0]
        
        # Auto-unlock for the creator so they own it
        unlock_insert = supabase.table("lead_unlocks").insert({
            "user_id": current_user.user_id,
            "lead_id": new_lead["id"],
            "status": "new"
        }).execute()
        
        return new_lead
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ClientLeadCreate(BaseModel):
    description: str
    style: str | None = None
    location: str | None = None
    size: str | None = None
    budget: str | None = None
    city: str | None = None
    name: str | None = None
    contact: str

@router.post("/client")
async def create_client_lead(
    lead_data: ClientLeadCreate,
    supabase: Client = Depends(get_supabase_client)
):
    """Public endpoint for clients submitting leads via the Landing Page."""
    try:
        # Format the lead for the DB
        title = f"{lead_data.style or 'Тату'} {lead_data.location or ''} {lead_data.size or ''}".strip()
        if not title:
            title = "Новая заявка на тату"
            
        full_description = f"{lead_data.description}\n\n"
        if lead_data.budget:
            full_description += f"Бюджет: {lead_data.budget}\n"
        if lead_data.city:
            full_description += f"Город: {lead_data.city}\n"
            
        contacts = f"Имя: {lead_data.name or 'Без имени'}, Контакт: {lead_data.contact}"

        db_lead = {
            "title": title[:255],
            "description": full_description,
            "contacts": contacts,
            "price_credits": 50, # default price
            "trust_score": 100
        }

        lead_insert = supabase.table("leads").insert(db_lead).execute()
        if not lead_insert.data:
            raise HTTPException(status_code=400, detail="Failed to create lead")
            
        return {"success": True, "lead": lead_insert.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
