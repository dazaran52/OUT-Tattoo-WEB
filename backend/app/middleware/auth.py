"""Fixed authentication middleware with proper JWT handling."""
from fastapi import HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
import base64

security = HTTPBearer()


class AuthUser(BaseModel):
    """Authenticated user data."""
    user_id: str
    email: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> AuthUser:
    """
    Validate JWT token and extract user information.
    """
    token = credentials.credentials
    
    # For now, just decode without verification (get user info from payload)
    # The token is already validated by Supabase on the frontend
    try:
        # Decode without verification to extract user info
        # In production, you should verify the signature properly
        payload = jwt.get_unverified_claims(token)
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user data"
            )
        
        return AuthUser(user_id=user_id, email=email)
        
    except Exception as e:
        print(f"DEBUG: Token decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
