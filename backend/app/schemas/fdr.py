from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal

IdType = Union[UUID, str]

class DocumentBase(BaseModel):
    document_type: str = "original_fdr"
    original_filename: str
    description: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: IdType
    fdr_id: IdType
    institution_id: IdType
    storage_path: str
    mime_type: str
    file_size_bytes: int
    sha256_checksum: str
    uploaded_by: Optional[IdType] = None
    uploaded_at: datetime
    is_active: bool = True
    download_url: Optional[str] = None

class FDREventResponse(BaseModel):
    id: IdType
    fdr_id: IdType
    institution_id: IdType
    actor_id: Optional[IdType] = None
    actor_name: Optional[str] = None
    actor_email: Optional[str] = None
    event_type: str
    description: str
    metadata: Dict[str, Any] = {}
    created_at: datetime

class FDRBase(BaseModel):
    bank_id: IdType
    branch_id: IdType
    fdr_number: str
    amount: Decimal = Field(..., gt=0)
    currency: str = "INR"
    issue_date: date
    maturity_date: date
    interest_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    lien_in_favour: str
    remarks: Optional[str] = None

class FDRCreateRequest(FDRBase):
    # Optional institution_id can only be supplied by admins; for normal users it is auto-assigned from profile
    institution_id: Optional[IdType] = None

class FDRUpdateRequest(BaseModel):
    bank_id: Optional[IdType] = None
    branch_id: Optional[IdType] = None
    fdr_number: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    issue_date: Optional[date] = None
    maturity_date: Optional[date] = None
    interest_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    lien_in_favour: Optional[str] = None
    remarks: Optional[str] = None

class FDRResponse(FDRBase):
    id: IdType
    institution_id: IdType
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    bank_name: Optional[str] = None
    bank_code: Optional[str] = None
    branch_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    region_id: Optional[IdType] = None
    region_name: Optional[str] = None
    lifecycle_status: str = "pending"
    trust_tier: int = 1
    verification_status: str = "institution_declared"
    heartbeat_status: str = "not_started"
    last_heartbeat_at: Optional[datetime] = None
    next_heartbeat_at: Optional[datetime] = None
    heartbeat_failure_count: int = 0
    created_by: Optional[IdType] = None
    created_at: datetime
    updated_at: datetime
    documents: List[DocumentResponse] = []
    events: List[FDREventResponse] = []

class FDRListResponse(BaseModel):
    items: List[FDRResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class FDRSummaryStats(BaseModel):
    total_fdrs: int
    total_amount: Decimal
    pending_count: int
    active_count: int
    tier1_count: int
    upcoming_maturity_30d: int
    upcoming_maturity_90d: int
