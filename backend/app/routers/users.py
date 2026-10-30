import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import get_current_user, require_admin
from app.schemas.user import CreateUserRequest, UpdateUserStatusRequest, AssignRoleRequest, AssignRegionScopeRequest
from app.services.supabase_admin import supabase_admin

router = APIRouter(prefix="/api/users", tags=["User Management & RBAC"])
logger = logging.getLogger("fdr_chain.users_router")

@router.get("/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Returns the authenticated user's profile and verified database roles.
    """
    return current_user

@router.post("", dependencies=[Depends(require_admin)], status_code=status.HTTP_201_CREATED)
async def provision_user(user_req: CreateUserRequest):
    """
    Privileged server-side account provisioning by System Administrator.
    Creates auth user and sets profile, roles, and institutional links safely.
    """
    try:
        res = supabase_admin.create_user_admin(user_req.model_dump())
        return res
    except Exception as e:
        logger.error(f"Failed to provision user: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User provisioning failed: {str(e)}"
        )

@router.patch("/{user_id}/status", dependencies=[Depends(require_admin)])
async def toggle_user_status(user_id: str, status_req: UpdateUserStatusRequest):
    """
    Admin toggle to activate or deactivate a user account.
    """
    try:
        supabase_admin.set_user_active_status(user_id, status_req.is_active)
        return {"user_id": user_id, "is_active": status_req.is_active, "message": "User status updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update user status: {str(e)}"
        )
