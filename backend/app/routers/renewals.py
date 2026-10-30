import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from app.auth.dependencies import get_current_user
from app.schemas.renewal import (
    RenewalCaseCreateRequest,
    RenewalCaseUpdateRequest,
    RenewalCaseSubmitRequest,
    RenewalApprovalRequest,
    RenewalRejectionRequest,
    RenewalCaseResponse,
    RenewalCaseListResponse,
    RenewalApprovalResponse,
    RenewalEvidenceResponse,
    FDRLineageGraphResponse,
    MatchingResultResponse,
    RenewalDashboardStatsResponse,
)
from app.services.renewal_service import renewal_service

router = APIRouter(prefix="/api/v1", tags=["Renewal Management & FDR Lineage (Phase 5)"])
logger = logging.getLogger("fdr_chain.renewals_router")

@router.get("/renewals/dashboard/stats", response_model=RenewalDashboardStatsResponse)
async def get_renewal_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """
    Retrieves high-level analytics and review workload statistics for the renewal dashboard.
    """
    return renewal_service.get_dashboard_stats(current_user)

@router.get("/renewals", response_model=RenewalCaseListResponse)
async def list_renewal_cases(
    status: Optional[str] = Query(None, description="Filter by case status (draft, under_review, approved, rejected)"),
    institution_id: Optional[str] = Query(None, description="Filter by institution ID"),
    search: Optional[str] = Query(None, description="Search case number, FDR number, or notes"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Lists renewal cases with institutional and role-based access control.
    """
    return renewal_service.get_renewal_cases(
        current_user=current_user,
        status_filter=status,
        institution_id=institution_id,
        search=search,
        page=page,
        page_size=page_size
    )

@router.post("/fdrs/{fdr_id}/renewals", response_model=RenewalCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_renewal_case(
    fdr_id: str,
    payload: RenewalCaseCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Creates a new renewal case draft for the specified FDR.
    """
    return renewal_service.create_renewal_case(fdr_id, payload, current_user)

@router.get("/fdrs/{fdr_id}/renewals", response_model=RenewalCaseListResponse)
async def get_fdr_renewal_cases(
    fdr_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves all renewal cases associated with a given FDR record.
    """
    return renewal_service.get_renewal_cases(
        current_user=current_user,
        original_fdr_id=fdr_id,
        page=page,
        page_size=page_size
    )

@router.get("/fdrs/{fdr_id}/lineage", response_model=FDRLineageGraphResponse)
async def get_fdr_lineage(
    fdr_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Returns the complete recursive lineage DAG (ancestors and descendants) for the given FDR.
    """
    return renewal_service.get_fdr_lineage(fdr_id, current_user)

@router.get("/renewals/{case_id}", response_model=RenewalCaseResponse)
async def get_renewal_case(
    case_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves full details of a specific renewal case, including original and replacement FDR snapshots.
    """
    return renewal_service.get_renewal_case_by_id(case_id, current_user)

@router.patch("/renewals/{case_id}", response_model=RenewalCaseResponse)
async def update_renewal_case(
    case_id: str,
    payload: RenewalCaseUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Updates an existing draft renewal case. Prohibited once submitted or decided.
    """
    return renewal_service.update_renewal_case(case_id, payload, current_user)

@router.post("/renewals/{case_id}/submit", response_model=RenewalCaseResponse)
async def submit_renewal_case(
    case_id: str,
    payload: RenewalCaseSubmitRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Submits a draft renewal case for supervisory and regulatory review.
    """
    return renewal_service.submit_renewal_case(case_id, payload, current_user)

@router.post("/renewals/{case_id}/match", response_model=MatchingResultResponse)
@router.get("/renewals/{case_id}/matches", response_model=MatchingResultResponse)
async def run_renewal_matching(
    case_id: str,
    candidate_id: Optional[str] = Query(None, description="Optional specific candidate FDR ID to evaluate"),
    current_user: dict = Depends(get_current_user)
):
    """
    Runs the 6-signal candidate matching scoring engine.
    Advisory only; never creates links or mutates status automatically.
    """
    return renewal_service.run_matching_for_case(case_id, current_user, candidate_id)

@router.post("/renewals/{case_id}/evidence", response_model=RenewalEvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_renewal_evidence(
    case_id: str,
    evidence_type: str = Form(..., description="Category of supporting document"),
    description: Optional[str] = Form(None),
    file: UploadFile = File(..., description="Document file (PDF, JPEG, PNG, max 10MB)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Uploads supporting evidence (replacement copy, renewal advice, closure confirmation) to private store.
    """
    return renewal_service.attach_evidence(
        case_id=case_id,
        evidence_type=evidence_type,
        file=file,
        description=description,
        current_user=current_user
    )

@router.post("/renewals/{case_id}/approve", response_model=RenewalApprovalResponse)
async def approve_renewal_case(
    case_id: str,
    payload: RenewalApprovalRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Atomically approves a renewal case and establishes a directed lineage edge.
    Transitions original FDR to 'renewed'. Enforces cycle prevention and bank verification.
    """
    return renewal_service.approve_renewal_case(case_id, payload, current_user)

@router.post("/renewals/{case_id}/reject", response_model=RenewalCaseResponse)
async def reject_renewal_case(
    case_id: str,
    payload: RenewalRejectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Rejects a renewal case with mandatory rejection justification.
    """
    return renewal_service.reject_renewal_case(case_id, payload, current_user)
