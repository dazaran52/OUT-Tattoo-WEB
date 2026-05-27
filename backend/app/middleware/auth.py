"""Authentication middleware and dependencies."""
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel
from app.config import get_settings


security = HTTPBearer()


class AuthUser(BaseModel):
    """Authenticated user model extracted from JWT."""
    user_id: str
    email: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> AuthUser:
    """
    Validate JWT token and extract user information.
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        AuthUser with user_id and email
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials
    settings = get_settings()
    
    # Debug logging
    print(f"DEBUG: Received token (first 50 chars): {token[:50]}...")
    print(f"DEBUG: JWT_SECRET configured: {bool(settings.SUPABASE_JWT_SECRET)}")
    
    try:
        # Decode and verify JWT token
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"]
        )
        
        # Extract user data from token
        user_id = payload.get("sub")
        email = payload.get("email")
        
        print(f"DEBUG: Token decoded successfully, user_id={user_id}, email={email}")
        
        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user data"
            )
        
        return AuthUser(user_id=user_id, email=email)
        
    except JWTError as e:
        print(f"DEBUG: JWT decode error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}"
        )
    except Exception as e:
        print(f"DEBUG: Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation error: {str(e)}"
        )
