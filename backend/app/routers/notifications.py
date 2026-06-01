from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.supabase_client import supabase
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: str

@router.get("", response_model=list[NotificationResponse])
async def get_notifications(current_user=Depends(get_current_user)):
    user_id = current_user.user.id
    
    res = supabase.table("notifications").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute()
    
    if not res.data:
        return []
        
    return res.data

@router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user=Depends(get_current_user)):
    user_id = current_user.user.id
    
    res = supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).eq("user_id", user_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    return res.data[0]

@router.put("/read-all")
async def mark_all_notifications_read(current_user=Depends(get_current_user)):
    user_id = current_user.user.id
    
    res = supabase.table("notifications").update({"is_read": True}).eq("user_id", user_id).eq("is_read", False).execute()
    
    return {"message": "All notifications marked as read"}
