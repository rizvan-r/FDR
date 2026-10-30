from typing import Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class RegionBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    state_coverage: list[str] = []
    is_active: bool = True

class RegionCreate(RegionBase):
    pass

class RegionUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    state_coverage: Optional[list[str]] = None
    is_active: Optional[bool] = None

class RegionResponse(RegionBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

# --- Institution ---
class InstitutionBase(BaseModel):
    code: str
    name: str
    institution_type: str = "government_department"
    region_id: Optional[UUID] = None
    registration_number: Optional[str] = None
    nodal_ministry: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = True

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    institution_type: Optional[str] = None
    region_id: Optional[UUID] = None
    registration_number: Optional[str] = None
    nodal_ministry: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None

class InstitutionResponse(InstitutionBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

# --- Bank and Bank Branch ---
class BankBase(BaseModel):
    code: str
    name: str
    bank_type: str = "public_sector"
    headquarters: Optional[str] = None
    nodal_contact_name: Optional[str] = None
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = True

class BankCreate(BankBase):
    pass

class BankResponse(BankBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

class BankBranchBase(BaseModel):
    bank_id: UUID
    branch_name: str
    branch_code: Optional[str] = None
    ifsc_code: str
    region_id: Optional[UUID] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    is_active: bool = True

class BankBranchCreate(BankBranchBase):
    pass

class BankBranchResponse(BankBranchBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
