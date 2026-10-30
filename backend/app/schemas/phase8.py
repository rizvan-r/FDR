"""
Pydantic schemas for Phase 8: FDR Release, Refund & Closure Management.
"""
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, Field

IDType = Union[UUID, str]

# -----------------------------------------------------------------------------
# 1. RELEASE POLICY VERSIONS
# -----------------------------------------------------------------------------
class ChecklistConfigItem(BaseModel):
    key: str
    title: str
    description: Optional[str] = None
    is_required: bool = True

class ApprovalConfigStage(BaseModel):
    stage: str
    role: str
    label: str

class ApprovalConfiguration(BaseModel):
    stages: List[ApprovalConfigStage] = []
    require_separation_of_duties: bool = True
    allow_self_approval: bool = False

class ReleasePolicyCreate(BaseModel):
    policy_name: str
    policy_version: str
    policy_description: Optional[str] = None
    source_reference: str = "AICTE Approval Process Handbook (APH)"
    effective_from: Optional[datetime] = None
    effective_until: Optional[datetime] = None
    checklist_configuration: List[Dict[str, Any]] = []
    approval_configuration: Dict[str, Any] = {}
    is_active: bool = True

class ReleasePolicyUpdate(BaseModel):
    policy_name: Optional[str] = None
    policy_description: Optional[str] = None
    source_reference: Optional[str] = None
    checklist_configuration: Optional[List[Dict[str, Any]]] = None
    approval_configuration: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class ReleasePolicyResponse(BaseModel):
    id: IDType
    policy_name: str
    policy_version: str
    policy_description: Optional[str] = None
    source_reference: str
    effective_from: Union[datetime, str]
    effective_until: Optional[Union[datetime, str]] = None
    checklist_configuration: List[Dict[str, Any]] = []
    approval_configuration: Dict[str, Any] = {}
    is_active: bool
    created_by: Optional[IDType] = None
    created_at: Union[datetime, str]

# -----------------------------------------------------------------------------
# 2. CHECKLIST ITEMS
# -----------------------------------------------------------------------------
class ChecklistItemUpdate(BaseModel):
    review_status: str = Field(..., pattern="^(pending|satisfied|not_satisfied|not_applicable|needs_clarification)$")
    evidence_document_id: Optional[IDType] = None
    review_comments: Optional[str] = None

class ChecklistItemResponse(BaseModel):
    id: IDType
    release_request_id: IDType
    policy_requirement_key: str
    requirement_title: str
    requirement_description: Optional[str] = None
    is_required: bool
    review_status: str
    evidence_document_id: Optional[IDType] = None
    reviewed_by: Optional[IDType] = None
    reviewed_at: Optional[Union[datetime, str]] = None
    review_comments: Optional[str] = None
    created_at: Union[datetime, str]
    updated_at: Union[datetime, str]

# -----------------------------------------------------------------------------
# 3. REVIEWS & DECISIONS
# -----------------------------------------------------------------------------
class ReleaseReviewCreate(BaseModel):
    review_stage: str = Field(..., pattern="^(preliminary_review|eligibility_review|finance_review|authority_review)$")
    review_decision: str = Field(..., pattern="^(recommend_approval|recommend_rejection|return_for_correction|approved|rejected)$")
    comments: str

class ReleaseReviewResponse(BaseModel):
    id: IDType
    release_request_id: IDType
    review_stage: str
    reviewer_id: IDType
    reviewer_name: Optional[str] = None
    reviewer_role: Optional[str] = None
    review_decision: str
    comments: str
    reviewed_at: Union[datetime, str]
    created_at: Union[datetime, str]

class ReleaseRequestReturn(BaseModel):
    comments: str

class ReleaseRequestDecision(BaseModel):
    decision: str = Field(..., pattern="^(approve|reject)$")
    comments: str

# -----------------------------------------------------------------------------
# 4. BANK RELEASE RECORDS
# -----------------------------------------------------------------------------
class ReleaseInstructionCreate(BaseModel):
    instruction_reference: Optional[str] = None
    bank_notes: Optional[str] = None

class BankConfirmationCreate(BaseModel):
    bank_reference: str
    bank_confirmation_date: Optional[Union[datetime, str]] = None
    confirmation_method: str = "simulated_bank_portal"
    evidence_document_id: Optional[IDType] = None
    decision: str = Field("released", pattern="^(released|release_rejected|unconfirmed)$")
    notes: Optional[str] = None

class BankReleaseRecordResponse(BaseModel):
    id: IDType
    release_request_id: IDType
    fdr_id: IDType
    bank_id: Optional[IDType] = None
    bank_name: Optional[str] = None
    release_status: str
    instruction_reference: Optional[str] = None
    bank_reference: Optional[str] = None
    bank_confirmation_date: Optional[Union[datetime, str]] = None
    confirmation_method: Optional[str] = None
    evidence_document_id: Optional[IDType] = None
    confirmed_by: Optional[IDType] = None
    is_mock: bool = True
    disclaimer: str = "SIMULATED DEMO — NOT AN ACTUAL BANK MONEY TRANSFER"
    created_at: Union[datetime, str]
    updated_at: Union[datetime, str]

# -----------------------------------------------------------------------------
# 5. REFUND & TRANSACTIONS
# -----------------------------------------------------------------------------
class RefundRecordCreate(BaseModel):
    expected_amount: float = Field(..., ge=0)
    received_amount: float = Field(0.0, ge=0)
    currency: str = "INR"
    refund_reference: Optional[str] = None
    refund_date: Optional[Union[date, str]] = None
    payment_mode: Optional[str] = None
    supporting_document_id: Optional[IDType] = None

class RefundTransactionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    transaction_reference: str
    transaction_date: Optional[Union[date, str]] = None
    payment_mode: str
    utr_number: Optional[str] = None
    receipt_document_id: Optional[IDType] = None

class RefundTransactionResponse(BaseModel):
    id: IDType
    refund_record_id: IDType
    transaction_reference: str
    amount: float
    transaction_date: Union[date, str]
    payment_mode: str
    utr_number: Optional[str] = None
    receipt_document_id: Optional[IDType] = None
    recorded_by: IDType
    created_at: Union[datetime, str]

class RefundRecordResponse(BaseModel):
    id: IDType
    release_request_id: IDType
    fdr_id: IDType
    expected_amount: float
    received_amount: float
    currency: str
    refund_status: str
    refund_reference: Optional[str] = None
    refund_date: Optional[Union[date, str]] = None
    payment_mode: Optional[str] = None
    supporting_document_id: Optional[IDType] = None
    recorded_by: IDType
    transactions: List[RefundTransactionResponse] = []
    created_at: Union[datetime, str]
    updated_at: Union[datetime, str]

class RefundReconciliationCreate(BaseModel):
    status: str = Field(..., pattern="^(reconciled|disputed|waived)$")
    reconciliation_notes: str

# -----------------------------------------------------------------------------
# 6. CLOSURE
# -----------------------------------------------------------------------------
class ReleaseClosureCreate(BaseModel):
    closure_notes: str
    closure_evidence_document_id: Optional[IDType] = None

class ReleaseClosureResponse(BaseModel):
    id: IDType
    release_request_id: IDType
    closure_status: str
    reconciliation_status: str
    reconciled_by: Optional[IDType] = None
    reconciled_at: Optional[Union[datetime, str]] = None
    closure_notes: Optional[str] = None
    closure_evidence_document_id: Optional[IDType] = None
    closed_by: Optional[IDType] = None
    closed_at: Optional[Union[datetime, str]] = None
    created_at: Union[datetime, str]

# -----------------------------------------------------------------------------
# 7. RELEASE REQUESTS
# -----------------------------------------------------------------------------
class ReleaseRequestCreate(BaseModel):
    request_reason: str = Field(..., min_length=10)
    policy_version_id: Optional[IDType] = None

class ReleaseRequestUpdate(BaseModel):
    request_reason: Optional[str] = None

class ReleaseRequestResponse(BaseModel):
    id: IDType
    request_number: str
    fdr_id: IDType
    fdr_number: Optional[str] = None
    principal_amount: Optional[float] = None
    bank_name: Optional[str] = None
    institution_id: IDType
    institution_name: Optional[str] = None
    requested_by: IDType
    request_reason: str
    request_status: str
    policy_version_id: IDType
    policy_version: Optional[str] = None
    submitted_at: Optional[Union[datetime, str]] = None
    current_reviewer_id: Optional[IDType] = None
    final_decision_by: Optional[IDType] = None
    final_decision_at: Optional[Union[datetime, str]] = None
    decision_comments: Optional[str] = None
    bank_release_status: Optional[str] = None
    refund_status: Optional[str] = None
    created_at: Union[datetime, str]
    updated_at: Union[datetime, str]

class ReleaseRequestDetailResponse(ReleaseRequestResponse):
    fdr_details: Optional[Dict[str, Any]] = None
    policy_details: Optional[ReleasePolicyResponse] = None
    checklist_items: List[ChecklistItemResponse] = []
    reviews: List[ReleaseReviewResponse] = []
    bank_release: Optional[BankReleaseRecordResponse] = None
    refund_record: Optional[RefundRecordResponse] = None
    closure_record: Optional[ReleaseClosureResponse] = None

class ReleaseDashboardStats(BaseModel):
    total_requests: int
    draft_count: int
    under_review_count: int
    approved_count: int
    bank_release_pending: int
    refund_pending: int
    closed_count: int
    total_released_amount: float
