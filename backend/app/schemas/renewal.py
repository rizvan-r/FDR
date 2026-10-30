from typing import Optional, List, Dict, Any, Literal, Union
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal

IdType = Union[UUID, str]

RenewalCaseStatusType = Literal[
    'draft',
    'submitted',
    'matching',
    'evidence_pending',
    'awaiting_bank_confirmation',
    'bank_confirmed',
    'under_review',
    'approved',
    'rejected',
    'cancelled',
]

LineageRelationshipType = Literal['renewal', 'replacement']

RenewalEvidenceType = Literal[
    'replacement_fdr_copy',
    'bank_renewal_advice',
    'original_fdr_closure',
    'bank_pledge_confirmation',
    'other',
    'other_supporting_document',
]

# ==============================================================================
# 1. RENEWAL EVIDENCE SCHEMAS
# ==============================================================================

class RenewalEvidenceCreate(BaseModel):
    document_id: Optional[IdType] = None
    evidence_type: str = 'replacement_fdr_copy'
    remarks: Optional[str] = None
    description: Optional[str] = None

class RenewalEvidenceResponse(BaseModel):
    id: IdType
    renewal_case_id: IdType
    document_id: Optional[IdType] = None
    evidence_type: str
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    sha256_checksum: Optional[str] = None
    description: Optional[str] = None
    is_reviewed: bool = False
    verification_status: str = 'pending'
    verified_by: Optional[IdType] = None
    verified_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None
    document: Optional[Dict[str, Any]] = None

# ==============================================================================
# 2. MATCHING CANDIDATE SCHEMAS
# ==============================================================================

class RenewalMatchCandidate(BaseModel):
    candidate_fdr_id: IdType
    candidate_fdr_number: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: str = 'INR'
    issue_date: Optional[date] = None
    maturity_date: Optional[date] = None
    trust_tier: Optional[int] = 1
    heartbeat_status: Optional[str] = 'healthy'
    score: float = Field(0.0, ge=0.0, le=100.0)
    match_score: Optional[float] = None
    confidence_level: Optional[Literal['high', 'moderate', 'low']] = 'moderate'
    matching_factors: List[str] = Field(default_factory=list)
    mismatched_fields: List[str] = Field(default_factory=list)
    explanation: Optional[str] = None

class RenewalMatchResult(BaseModel):
    parent_fdr_id: Optional[IdType] = None
    evaluated_at: Optional[datetime] = None
    total_candidates_evaluated: Optional[int] = 0
    candidates: List[Any] = Field(default_factory=list)
    suggestions: List[Any] = Field(default_factory=list)
    advisory_notice: str = "Matching suggestions are advisory only and must never be interpreted as automatic approval or legal lineage."

MatchingResultResponse = RenewalMatchResult

# ==============================================================================
# 3. RENEWAL CASE REQUEST & RESPONSE SCHEMAS
# ==============================================================================

class RenewalCaseCreate(BaseModel):
    parent_fdr_id: Optional[IdType] = None
    original_fdr_id: Optional[IdType] = None
    proposed_fdr_id: Optional[IdType] = None
    proposed_replacement_fdr_id: Optional[IdType] = None
    renewal_reference: Optional[str] = Field(None, max_length=100)
    submission_notes: Optional[str] = None
    decision_note: Optional[str] = None
    evidence_documents: Optional[List[RenewalEvidenceCreate]] = None

RenewalCaseCreateRequest = RenewalCaseCreate

class RenewalCaseUpdate(BaseModel):
    proposed_fdr_id: Optional[IdType] = None
    proposed_replacement_fdr_id: Optional[IdType] = None
    renewal_reference: Optional[str] = None
    submission_notes: Optional[str] = None
    decision_note: Optional[str] = None

RenewalCaseUpdateRequest = RenewalCaseUpdate

class RenewalCaseSubmit(BaseModel):
    proposed_replacement_fdr_id: Optional[IdType] = None
    submission_notes: Optional[str] = None

RenewalCaseSubmitRequest = RenewalCaseSubmit

class RenewalCaseApprove(BaseModel):
    decision_note: Optional[str] = Field(None, max_length=1000)
    decision_notes: Optional[str] = Field(None, max_length=1000)
    relationship_type: LineageRelationshipType = 'renewal'

RenewalApprovalRequest = RenewalCaseApprove

class RenewalCaseReject(BaseModel):
    rejection_reason: str = Field(..., min_length=5, max_length=1000, description="Mandatory reason for case rejection")

RenewalRejectionRequest = RenewalCaseReject

class RenewalCaseResponse(BaseModel):
    id: IdType
    case_number: Optional[str] = None
    parent_fdr_id: Optional[IdType] = None
    original_fdr_id: Optional[IdType] = None
    parent_fdr_number: Optional[str] = None
    proposed_fdr_id: Optional[IdType] = None
    proposed_replacement_fdr_id: Optional[IdType] = None
    proposed_fdr_number: Optional[str] = None
    institution_id: IdType
    institution_name: Optional[str] = None
    bank_id: Optional[IdType] = None
    bank_name: Optional[str] = None
    status: Optional[str] = None
    case_status: Optional[str] = None
    submission_notes: Optional[str] = None
    renewal_reference: Optional[str] = None
    match_score: Optional[float] = None
    matching_score: Optional[float] = None
    matching_analysis: Optional[Dict[str, Any]] = None
    match_explanation: Optional[Dict[str, Any]] = None
    submitted_by: Optional[IdType] = None
    submitted_by_name: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewer_id: Optional[IdType] = None
    reviewed_by: Optional[IdType] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    decision_notes: Optional[str] = None
    decision_note: Optional[str] = None
    evidence_count: Optional[int] = 0
    evidence: List[Any] = Field(default_factory=list)
    original_fdr: Optional[Dict[str, Any]] = None
    proposed_replacement_fdr: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class RenewalCaseListResponse(BaseModel):
    items: List[RenewalCaseResponse] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 1

class RenewalApprovalResponse(BaseModel):
    success: bool = True
    case_id: IdType
    case_number: Optional[str] = None
    status: str = "approved"
    lineage_id: IdType
    parent_fdr_id: IdType
    child_fdr_id: IdType
    message: str = "Renewal case approved and lineage relationship atomically committed."

class RenewalCaseDetailResponse(RenewalCaseResponse):
    parent_fdr: Optional[Dict[str, Any]] = None
    proposed_fdr: Optional[Dict[str, Any]] = None
    evidence: List[RenewalEvidenceResponse] = Field(default_factory=list)
    lineage_record: Optional[Dict[str, Any]] = None
    history_events: List[Dict[str, Any]] = Field(default_factory=list)

# ==============================================================================
# 4. FDR LINEAGE GRAPH SCHEMAS
# ==============================================================================

class FDRLineageNode(BaseModel):
    fdr_id: Optional[IdType] = None
    id: Optional[IdType] = None
    fdr_number: str
    institution_id: IdType
    institution_name: Optional[str] = None
    bank_id: Optional[IdType] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    amount: Decimal
    currency: str = 'INR'
    issue_date: Optional[date] = None
    maturity_date: Optional[date] = None
    lifecycle_status: str
    trust_tier: int
    verification_status: Optional[str] = 'institution_declared'
    heartbeat_status: str
    is_current: bool = False
    is_current_target: bool = False
    generation_level: int = 0

class FDRLineageEdge(BaseModel):
    id: IdType
    parent_fdr_id: IdType
    child_fdr_id: IdType
    renewal_case_id: Optional[IdType] = None
    relationship_type: LineageRelationshipType = 'renewal'
    approved_by: Optional[IdType] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    evidence_reference: Dict[str, Any] = Field(default_factory=dict)

class FDRLineageGraphResponse(BaseModel):
    target_fdr_id: Optional[IdType] = None
    center_fdr_id: Optional[IdType] = None
    root_fdr_id: IdType
    chain_length: Optional[int] = None
    total_nodes: Optional[int] = 0
    total_edges: Optional[int] = 0
    has_predecessor: Optional[bool] = None
    has_successor: Optional[bool] = None
    has_cycles: bool = False
    is_leaf: Optional[bool] = None
    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    edges: List[Dict[str, Any]] = Field(default_factory=list)
    ancestors: List[Dict[str, Any]] = Field(default_factory=list)
    descendants: List[Dict[str, Any]] = Field(default_factory=list)

# ==============================================================================
# 5. RENEWAL DASHBOARD & QUEUE SCHEMAS
# ==============================================================================

class RenewalDashboardStats(BaseModel):
    total_cases: int = 0
    draft_cases: int = 0
    draft_count: int = 0
    submitted_cases: int = 0
    submitted_count: int = 0
    awaiting_bank_confirmation: int = 0
    awaiting_bank_count: int = 0
    under_review_cases: int = 0
    under_review_count: int = 0
    approved_cases: int = 0
    approved_count: int = 0
    rejected_cases: int = 0
    rejected_count: int = 0
    upcoming_maturities_30d: int = 0
    upcoming_maturities_count: int = 0
    pending_officer_review: int = 0
    officer_queue_count: int = 0
    recent_cases: List[Any] = Field(default_factory=list)

RenewalDashboardStatsResponse = RenewalDashboardStats
