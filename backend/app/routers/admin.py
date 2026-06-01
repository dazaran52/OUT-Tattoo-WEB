from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client
from app.services.mail import send_transactional_email

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
            
        if update_data.status == "approved":
            target_user = response.data[0]
            
            # Reward Referrer if present
            if target_user.get("referred_by"):
                referrer_code = target_user["referred_by"]
                try:
                    referrer_res = supabase.table("users").select("id, discount_tokens, email").eq("own_referral_code", referrer_code).single().execute()
                    if referrer_res.data:
                        referrer_id = referrer_res.data["id"]
                        current_tokens = referrer_res.data.get("discount_tokens", 0)
                        supabase.table("users").update({"discount_tokens": current_tokens + 1}).eq("id", referrer_id).execute()
                        
                        # Notify referrer
                        supabase.table("notifications").insert({
                            "user_id": referrer_id,
                            "title": "Новый реферал!",
                            "message": f"Мастер {target_user.get('email')} был одобрен. Вы получили 1 скидочный токен (50% скидка)!",
                            "type": "system"
                        }).execute()
                except Exception as e:
                    print(f"Error rewarding referrer {referrer_code}: {e}")

            supabase.table("notifications").insert({
                "user_id": user_id,
                "title": "Профиль верифицирован",
                "message": "Ваш профиль успешно проверен администратором. Теперь вы можете получать заявки на тату!",
                "type": "system"
            }).execute()
            
            # Send Email
            user_email = target_user.get("email")
            if user_email:
                send_transactional_email(
                    to_email=user_email,
                    subject="Поздравляем! Ваш профиль OUT Tattoo верифицирован",
                    html_content="<h1>Добро пожаловать в OUT Tattoo!</h1><p>Ваш аккаунт успешно проверен. Теперь вы можете получать заявки на тату в нашем приложении.</p>"
                )
        elif update_data.status == "rejected":
            # Send Email for rejection
            user_email = response.data[0].get("email")
            if user_email:
                send_transactional_email(
                    to_email=user_email,
                    subject="Статус вашего профиля OUT Tattoo",
                    html_content="<h1>Здравствуйте</h1><p>К сожалению, мы не можем подтвердить ваш аккаунт на данный момент.</p>"
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
            
        # Send Email notification for balance change
        user_email = response.data[0].get("email")
        if user_email:
            send_transactional_email(
                to_email=user_email,
                subject="Ваш баланс OUT Tattoo пополнен!",
                html_content=f"<h1>Ваш баланс обновлен</h1><p>Текущий баланс: <strong>{update_data.credits} кредитов</strong>.</p>"
            )
            
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

