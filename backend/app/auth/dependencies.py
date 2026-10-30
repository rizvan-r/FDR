from typing import List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.jwt import token_validator
from app.services.supabase_admin import supabase_admin

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is required (Bearer token)"
        )

    token = credentials.credentials
    token_payload = await token_validator.verify_token(token)
    user_id = token_payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject identity"
        )

    # Fetch user profile and roles from PostgreSQL
    try:
        user_profile = supabase_admin.get_user_profile_and_roles(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unable to retrieve user profile: {str(e)}"
        )

    if not user_profile.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Contact your administrator."
        )

    return user_profile

def require_roles(allowed_roles: List[str]) -> Callable:
    async def role_checker(current_user: dict = Depends(get_current_user)):
        user_roles = current_user.get("roles", [])
        # Check if user has at least one of the allowed roles
        has_permission = any(role in allowed_roles for role in user_roles)
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

require_admin = require_roles(["system_admin"])
