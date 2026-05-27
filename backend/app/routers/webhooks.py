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

class SandboxPayload(BaseModel):
    email: str
    amount: float

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
    
    # Calculate credits (Proportional: 500 Credits for 830 UAH)
    try:
        raw_amt = float(payload.actualAmount or payload.amount or "830")
        credits_to_deposit = round(raw_amt * (500 / 830))
    except ValueError:
        credits_to_deposit = 500

    new_balance = master["credits"] + credits_to_deposit
    
    # Update balance
    supabase.table("users").update({"credits": new_balance}).eq("id", master["id"]).execute()

    return {
        "success": True,
        "message": "Deposit successful",
        "email": matched_email,
        "creditsAdded": credits_to_deposit,
        "newBalance": new_balance
    }

@router.post("/sandbox/simulate-payment")
async def simulate_payment(
    payload: SandboxPayload,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Sandbox endpoint to simulate a payment for an email.
    """
    matched_email = payload.email.lower()
    user_res = supabase.table("users").select("*").eq("email", matched_email).execute()
    
    if not user_res.data or len(user_res.data) == 0:
        raise HTTPException(status_code=404, detail=f"Chyba simulace: Tatér s emailem {matched_email} nebyl nalezen.")
        
    master = user_res.data[0]
    
    actual_amount = payload.amount * 0.95
    credits_to_deposit = round(actual_amount * (500 / 830))
    new_balance = master["credits"] + credits_to_deposit
    
    supabase.table("users").update({"credits": new_balance}).eq("id", master["id"]).execute()

    return {
        "success": True,
        "message": "Simulace úspěšná! Kredity byly doručeny.",
        "creditsAdded": credits_to_deposit,
        "newBalance": new_balance
    }
