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
    print(f"DEBUG: JWT_SECRET type: {type(settings.SUPABASE_JWT_SECRET)}")
    print(f"DEBUG: JWT_SECRET starts with: {settings.SUPABASE_JWT_SECRET[:30] if settings.SUPABASE_JWT_SECRET else 'EMPTY'}")
    
    # Try to decode JWT secret from base64 if needed
    import base64
    jwt_secret = settings.SUPABASE_JWT_SECRET
    try:
        # Try base64 decode
        decoded = base64.b64decode(jwt_secret)
        # Check if it looks like PEM
        if b'BEGIN' in decoded or b'-----' in decoded:
            jwt_secret = decoded.decode('utf-8')
            print(f"DEBUG: Using base64 decoded JWT secret")
        else:
            print(f"DEBUG: Using raw JWT secret (not base64 PEM)")
    except Exception as e:
        print(f"DEBUG: Using raw JWT secret, base64 decode failed: {e}")
    
    try:
        # Decode and verify JWT token
        # Supabase uses ES256 (ECDSA) algorithm, not HS256
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["ES256"]
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
