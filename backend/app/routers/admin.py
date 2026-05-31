from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client

router = APIRouter(prefix="/api/admin", tags=["admin"])

class UserStatusUpdate(BaseModel):
    status: str

class UserCreditsUpdate(BaseModel):
    credits: int

class AdminUserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    phone: str | None = None
    bio: str | None = None
    status: str
    credits: int
    created_at: str

class LeadCreate(BaseModel):
    title: str
    description: str
    contacts: str
    price_credits: int
    image_urls: List[str] = []

class LeadUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    contacts: str | None = None
    price_credits: int | None = None
    image_urls: List[str] | None = None

async def get_admin_user(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> AuthUser:
    """Dependency to check if current user is an admin."""
    try:
        response = supabase.table("users") \
            .select("is_admin") \
            .eq("id", current_user.user_id) \
            .single() \
            .execute()
        
        if not response.data or not response.data.get("is_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
            
        return current_user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying admin status: {str(e)}"
        )


@router.get("/users", response_model=List[AdminUserResponse])
async def get_users(
    status_filter: str | None = None,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
) -> List[AdminUserResponse]:
    """Get all users, optionally filtered by status."""
    try:
        query = supabase.table("users").select("*").order("created_at", desc=True)
        
        if status_filter:
            query = query.eq("status", status_filter)
            
        response = query.execute()
        
        return [
            AdminUserResponse(
                id=u["id"],
                email=u["email"],
                display_name=u.get("display_name"),
                phone=u.get("phone"),
                bio=u.get("bio"),
                status=u.get("status", "pending"),
                credits=u["credits"],
                created_at=u["created_at"]
            )
            for u in response.data
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    update_data: UserStatusUpdate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Approve or reject a master account."""
    if update_data.status not in ["pending", "approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be pending, approved, or rejected"
        )
        
    try:
        response = supabase.table("users") \
            .update({"status": update_data.status}) \
            .eq("id", user_id) \
            .execute()
            
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        return {"message": f"User status updated to {update_data.status}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user status: {str(e)}"
        )

@router.put("/users/{user_id}/credits")
async def update_user_credits(
    user_id: str,
    update_data: UserCreditsUpdate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update a user's credit balance."""
    if update_data.credits < 0:
        raise HTTPException(status_code=400, detail="Credits cannot be negative")
        
    try:
        response = supabase.table("users") \
            .update({"credits": update_data.credits}) \
            .eq("id", user_id) \
            .execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {"message": f"User credits updated to {update_data.credits}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating credits: {str(e)}")

@router.delete("/chat/{user_id}")
async def clear_user_chat(
    user_id: str,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Delete all support messages for a specific user."""
    try:
        response = supabase.table("support_messages") \
            .delete() \
            .eq("user_id", user_id) \
            .execute()
            
        return {"message": "Chat history cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing chat: {str(e)}")


@router.get("/leads")
async def get_admin_leads(
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get all leads with unmasked contacts for admin."""
    try:
        response = supabase.table("leads").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching leads: {str(e)}"
        )

@router.post("/leads")
async def create_lead(
    lead_data: LeadCreate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new lead."""
    try:
        response = supabase.table("leads").insert(lead_data.model_dump()).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create lead")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating lead: {str(e)}"
        )

@router.put("/leads/{lead_id}")
async def update_lead(
    lead_id: str,
    lead_data: LeadUpdate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update an existing lead."""
    try:
        update_dict = {k: v for k, v in lead_data.model_dump().items() if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        response = supabase.table("leads").update(update_dict).eq("id", lead_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating lead: {str(e)}"
        )

@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Delete a lead."""
    try:
        response = supabase.table("leads").delete().eq("id", lead_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        return {"message": "Lead deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting lead: {str(e)}"
        )

# --- Admin Payment Requests ---

class RejectRequest(BaseModel):
    message: str

@router.get("/payment_requests")
async def get_admin_payment_requests(
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        # Get all payment requests that are not pending (so screenshot uploaded, or already approved/rejected)
        # Actually, admin should see all, or at least screenshot_uploaded
        response = supabase.table("payment_requests") \
            .select("*, users!inner(email)") \
            .neq("status", "pending") \
            .order("created_at", desc=True) \
            .execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payment_requests/{req_id}/approve")
async def approve_payment_request(
    req_id: str,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        pr = supabase.table("payment_requests").select("*").eq("id", req_id).execute()
        if not pr.data:
            raise HTTPException(status_code=404, detail="Request not found")
            
        request_data = pr.data[0]
        if request_data["status"] != "screenshot_uploaded":
            raise HTTPException(status_code=400, detail="Only screenshot_uploaded can be approved")
            
        user_id = request_data["user_id"]
        credits_to_add = request_data["amount_credits"]
        
        # Add to transactions
        supabase.table("transactions").insert({
            "user_id": user_id,
            "amount": credits_to_add / 10 if request_data["currency"] == "EUR" else credits_to_add,
            "currency": request_data["currency"],
            "credits_added": credits_to_add,
            "provider": request_data["provider"],
            "provider_tx_id": f"manual_{req_id}"
        }).execute()
        
        # Add credits
        user_data = supabase.table("users").select("credits").eq("id", user_id).single().execute()
        if user_data.data:
            new_credits = user_data.data.get("credits", 0) + credits_to_add
            supabase.table("users").update({"credits": new_credits}).eq("id", user_id).execute()
            
        # Update status
        supabase.table("payment_requests").update({
            "status": "approved"
        }).eq("id", req_id).execute()
        
        return {"status": "approved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payment_requests/{req_id}/reject")
async def reject_payment_request(
    req_id: str,
    req: RejectRequest,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        pr = supabase.table("payment_requests").select("*").eq("id", req_id).execute()
        if not pr.data:
            raise HTTPException(status_code=404, detail="Request not found")
            
        supabase.table("payment_requests").update({
            "status": "rejected",
            "admin_message": req.message
        }).eq("id", req_id).execute()
        
        return {"status": "rejected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

