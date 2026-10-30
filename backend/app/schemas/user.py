from typing import Optional, List
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class RoleBase(BaseModel):
    id: UUID
    name: str
    display_name: str
    description: Optional[str] = None

class UserProfileBase(BaseModel):
    email: EmailStr
    full_name: str
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    phone: Optional[str] = None
    institution_id: Optional[UUID] = None
    bank_id: Optional[UUID] = None
    bank_branch_id: Optional[UUID] = None
    is_active: bool = True

class UserProfileResponse(UserProfileBase):
    id: UUID
    roles: List[str] = []
    region_scope_ids: List[UUID] = []
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    designation: Optional[str] = None
    employee_id: Optional[str] = None
    phone: Optional[str] = None
    role_name: str
    institution_id: Optional[UUID] = None
    bank_id: Optional[UUID] = None
    bank_branch_id: Optional[UUID] = None
    region_scope_ids: Optional[List[UUID]] = []

class UpdateUserStatusRequest(BaseModel):
    is_active: bool

class AssignRoleRequest(BaseModel):
    role_name: str

class AssignRegionScopeRequest(BaseModel):
    region_ids: List[UUID]
