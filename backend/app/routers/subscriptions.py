import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_supabase_client
from app.middleware.auth import get_current_user, AuthUser
from app.config import get_settings

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

# Setup stripe
settings = get_settings()
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', 'sk_test_dummy')
STRIPE_WEBHOOK_SECRET = getattr(settings, 'STRIPE_WEBHOOK_SECRET', 'whsec_dummy')

class PlanResponse(BaseModel):
    id: str
    name: str
    monthly_price: float
    credits_included: int
    features: List[str]

class SubscribeRequest(BaseModel):
    plan_id: str
    success_url: str
    cancel_url: str

@router.get("/plans", response_model=List[PlanResponse])
async def get_plans(supabase = Depends(get_supabase_client)):
    res = supabase.table("subscription_plans").select("*").eq("is_active", True).execute()
    return res.data

@router.get("/my")
async def get_my_subscription(
    current_user: AuthUser = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    res = supabase.table("user_subscriptions") \
        .select("*, subscription_plans(*)") \
        .eq("user_id", current_user.user_id) \
        .eq("status", "active") \
        .execute()
    if not res.data:
        return {"has_subscription": False}
    return {"has_subscription": True, "subscription": res.data[0]}

@router.post("/checkout")
async def create_checkout_session(
    req: SubscribeRequest,
    current_user: AuthUser = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    # Fetch plan
    plan_res = supabase.table("subscription_plans").select("*").eq("id", req.plan_id).execute()
    if not plan_res.data:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    plan = plan_res.data[0]
    
    # Check if user already has a customer ID
    sub_res = supabase.table("user_subscriptions").select("*").eq("user_id", current_user.user_id).execute()
    customer_id = sub_res.data[0]["stripe_customer_id"] if sub_res.data else None
    
    if not customer_id:
        user_res = supabase.table("users").select("email").eq("id", current_user.user_id).execute()
        email = user_res.data[0].get("email") if user_res.data else None
        customer = stripe.Customer.create(email=email, metadata={"user_id": current_user.user_id})
        customer_id = customer.id
        
    try:
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'recurring': {'interval': 'month'},
                    'product_data': {'name': f"Tattoo Hub {plan['name']} Plan"},
                    'unit_amount': int(plan['monthly_price'] * 100),
                },
                'quantity': 1,
            }],
            mode='subscription',
            success_url=req.success_url,
            cancel_url=req.cancel_url,
            metadata={"user_id": current_user.user_id, "plan_id": req.plan_id}
        )
        return {"checkout_url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    supabase = get_supabase_client()
    
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session['metadata'].get('user_id')
        plan_id = session['metadata'].get('plan_id')
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        
        if user_id and plan_id:
            # Upsert user subscription
            # First check if exists
            existing = supabase.table("user_subscriptions").select("id").eq("user_id", user_id).execute()
            if existing.data:
                supabase.table("user_subscriptions").update({
                    "plan_id": plan_id,
                    "stripe_customer_id": customer_id,
                    "stripe_subscription_id": subscription_id,
                    "status": "active"
                }).eq("user_id", user_id).execute()
            else:
                supabase.table("user_subscriptions").insert({
                    "user_id": user_id,
                    "plan_id": plan_id,
                    "stripe_customer_id": customer_id,
                    "stripe_subscription_id": subscription_id,
                    "status": "active"
                }).execute()
            
            # Award credits
            plan_res = supabase.table("subscription_plans").select("credits_included").eq("id", plan_id).execute()
            if plan_res.data:
                credits_to_add = plan_res.data[0].get("credits_included", 0)
                if credits_to_add > 0:
                    user_res = supabase.table("users").select("credits").eq("id", user_id).execute()
                    if user_res.data:
                        new_credits = user_res.data[0].get("credits", 0) + credits_to_add
                        supabase.table("users").update({"credits": new_credits}).eq("id", user_id).execute()
                        
            # Notify user
            supabase.table("notifications").insert({
                "user_id": user_id,
                "title": "Subscription Activated",
                "message": "Your Pro subscription has been activated successfully.",
                "type": "system"
            }).execute()

    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        status = subscription.get('status')
        sub_id = subscription.get('id')
        
        supabase.table("user_subscriptions").update({
            "status": status,
            "current_period_end": subscription.get('current_period_end')
        }).eq("stripe_subscription_id", sub_id).execute()

    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        sub_id = subscription.get('id')
        
        supabase.table("user_subscriptions").update({
            "status": "canceled"
        }).eq("stripe_subscription_id", sub_id).execute()

    return {"status": "success"}
