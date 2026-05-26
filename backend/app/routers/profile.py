"""Profile router for master data endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client


router = APIRouter(prefix="/api", tags=["profile"])


class ProfileResponse(BaseModel):
    """Profile data response model."""
    id: str
    email: str
    credits: int
    created_at: str | None = None


class ProfileCreate(BaseModel):
    """Profile creation data."""
    id: str
    email: str


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> ProfileResponse:
    """
    Get current master profile.
    
    If profile doesn't exist, creates it automatically with 0 credits.
    """
    try:
        # Try to fetch existing profile
        response = supabase.table("masters") \
            .select("*") \
            .eq("id", current_user.user_id) \
            .single() \
            .execute()
        
        if response.data:
            # Profile exists, return it
            data = response.data
            return ProfileResponse(
                id=data["id"],
                email=data["email"],
                credits=data["credits"],
                created_at=data.get("created_at")
            )
        
    except Exception:
        # Profile not found, will create below
        pass
    
    # Create new profile with 0 credits
    try:
        new_profile = {
            "id": current_user.user_id,
            "email": current_user.email,
            "credits": 0
        }
        
        response = supabase.table("masters") \
            .insert(new_profile) \
            .execute()
        
        if response.data and len(response.data) > 0:
            data = response.data[0]
            return ProfileResponse(
                id=data["id"],
                email=data["email"],
                credits=data["credits"],
                created_at=data.get("created_at")
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create profile"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating profile: {str(e)}"
        )
