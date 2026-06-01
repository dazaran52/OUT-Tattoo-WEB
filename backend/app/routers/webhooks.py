from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from app.database import get_supabase_client
from supabase import Client
from app.config import get_settings
import re

router = APIRouter(prefix="/api", tags=["webhooks"])

class DonatelloWebhookPayload(BaseModel):
    pubId: str
    client: str
    message: str
    amount: str
    actualAmount: str


@router.post("/webhooks/donatello")
async def donatello_webhook(
    payload: DonatelloWebhookPayload,
    request: Request,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Process Donatello webhook to assign credits.
    """
    settings = get_settings()
    
    # Validate header
    req_key = request.headers.get("X-Key") or request.headers.get("x-key-header")
    if req_key != settings.DONATELLO_X_KEY:
        raise HTTPException(status_code=401, detail="Neplatný token X-Key. / Invalid webhook key.")

    if not payload.message:
        raise HTTPException(status_code=400, detail="Chybí zpráva pro parzování emailu. / Commentary is missing.")

    # Extract email using regex
    email_regex = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{1,}"
    match = re.search(email_regex, payload.message)
    
    if not match:
        raise HTTPException(status_code=400, detail="Zástupný komentář neobsahuje žádný platný E-mail.")

    matched_email = match.group(0).lower()
    
    # Find master
    user_res = supabase.table("users").select("*").eq("email", matched_email).execute()
    if not user_res.data or len(user_res.data) == 0:
        raise HTTPException(status_code=404, detail=f"Uživatel s emailem {matched_email} nebyl v databázi nalezen.")
        
    master = user_res.data[0]
    
    # Calculate credits (Rate: 40 UAH = 1 EUR = 10 Credits => 0.25 credits per 1 UAH)
    try:
        raw_amt = float(payload.actualAmount or payload.amount or "0")
        credits_to_deposit = round(raw_amt * 0.25)
    except ValueError:
        credits_to_deposit = 0

    new_balance = master["credits"] + credits_to_deposit
    
    # Update balance
    supabase.table("users").update({"credits": new_balance}).eq("id", master["id"]).execute()
    
    # Create notification
    supabase.table("notifications").insert({
        "user_id": master["id"],
        "title": "Баланс пополнен",
        "message": f"Успешное пополнение через Donatello. Зачислено {credits_to_deposit} кредитов.",
        "type": "payment"
    }).execute()

    return {
        "success": True,
        "message": "Deposit successful",
        "email": matched_email,
        "creditsAdded": credits_to_deposit,
        "newBalance": new_balance
    }


