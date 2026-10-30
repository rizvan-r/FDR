"""
FastAPI Router for Phase 8: FDR Release, Refund & Closure Management.
Mounts at /api/v1/release-requests and /api/v1/fdrs/{fdr_id}/release-requests.
Also handles /api/v1/admin/release-policies.
"""
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.dependencies import get_current_user
from app.services.release_service import ReleaseService
from app.services.fdr_service import LOCAL_FDR_STORE
from app.schemas.phase8 import (
    ReleasePolicyCreate, ReleasePolicyUpdate, ReleasePolicyResponse,
    ChecklistItemUpdate, ChecklistItemResponse,
    ReleaseReviewCreate, ReleaseReviewResponse,
    ReleaseInstructionCreate, BankConfirmationCreate, BankReleaseRecordResponse,
    RefundTransactionCreate, RefundRecordResponse, RefundTransactionResponse,
    RefundReconciliationCreate, ReleaseClosureCreate, ReleaseClosureResponse,
    ReleaseRequestCreate, ReleaseRequestUpdate, ReleaseRequestResponse, ReleaseRequestDetailResponse,
    ReleaseDashboardStats, ReleaseRequestReturn, ReleaseRequestDecision
)

logger = logging.getLogger("fdr_chain.releases_router")

router = APIRouter(tags=["FDR Release, Refund & Closure Management (Phase 8)"])

def _get_fdr(fdr_id: str) -> Optional[Dict[str, Any]]:
    for fdr in LOCAL_FDR_STORE:
        if str(fdr.get("id")) == str(fdr_id):
            return fdr
    return None

def _update_fdr_lifecycle(fdr_id: str, new_status: str):
    for fdr in LOCAL_FDR_STORE:
        if str(fdr.get("id")) == str(fdr_id):
            fdr["lifecycle_status"] = new_status
            return True
    return False

def _get_user_role(current_user: dict) -> str:
    if current_user.get("role"):
        return current_user["role"]
    roles = current_user.get("roles", [])
    if roles:
        return roles[0]
    return "institution_user"

# ==============================================================================
# 1. RELEASE POLICIES (ADMIN)
# ==============================================================================

@router.get("/api/v1/admin/release-policies", response_model=List[ReleasePolicyResponse])
async def list_release_policies(current_user: dict = Depends(get_current_user)):
    return ReleaseService.list_policies()

@router.post("/api/v1/admin/release-policies", response_model=ReleasePolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_release_policy(
    policy_data: ReleasePolicyCreate,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role not in ("system_admin", "bureau_officer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only administrators or bureau officers can configure release policies."
        )
    return ReleaseService.create_policy(policy_data, current_user.get("id"))

@router.patch("/api/v1/admin/release-policies/{policy_id}", response_model=ReleasePolicyResponse)
async def update_release_policy(
    policy_id: str,
    update_data: ReleasePolicyUpdate,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role not in ("system_admin", "bureau_officer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only administrators or bureau officers can update release policies."
        )
    pol = ReleaseService.update_policy(policy_id, update_data)
    if not pol:
        raise HTTPException(status_code=404, detail="Release policy not found.")
    return pol

@router.post("/api/v1/admin/release-policies/{policy_id}/activate", response_model=ReleasePolicyResponse)
async def activate_release_policy(
    policy_id: str,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role not in ("system_admin", "bureau_officer"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges.")
    pol = ReleaseService.get_policy(policy_id)
    if not pol:
        raise HTTPException(status_code=404, detail="Release policy not found.")
    # Set all other policies inactive
    for p in ReleaseService.list_policies():
        p["is_active"] = (str(p["id"]) == str(policy_id))
    return pol

# ==============================================================================
# 2. RELEASE REQUESTS
# ==============================================================================

@router.get("/api/v1/release-requests/stats", response_model=ReleaseDashboardStats)
async def get_release_dashboard_stats(current_user: dict = Depends(get_current_user)):
    return ReleaseService.get_dashboard_stats(current_user)

@router.post("/api/v1/fdrs/{fdr_id}/release-requests", response_model=ReleaseRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_fdr_release_request(
    fdr_id: str,
    request_data: ReleaseRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        new_req = ReleaseService.create_release_request(
            fdr_id=fdr_id,
            request_data=request_data,
            user_info=current_user,
            fdr_repo_getter=_get_fdr
        )
        return new_req
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

@router.get("/api/v1/release-requests", response_model=List[ReleaseRequestResponse])
async def list_release_requests(
    status: Optional[str] = Query(None),
    institution_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return ReleaseService.list_release_requests(
        user_info=current_user,
        status=status,
        institution_id=institution_id
    )

@router.get("/api/v1/release-requests/{id}", response_model=ReleaseRequestDetailResponse)
async def get_release_request_detail(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    req = ReleaseService.get_release_request_detail(id, _get_fdr)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release request not found.")

    role = _get_user_role(current_user)
    current_user["role"] = role
    user_inst = current_user.get("institution_id")
    if role == "institution_user" and str(req.get("institution_id")) != str(user_inst):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to release request from another institution.")

    return req

@router.patch("/api/v1/release-requests/{id}", response_model=ReleaseRequestResponse)
async def update_release_request(
    id: str,
    update_data: ReleaseRequestUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        return ReleaseService.update_release_request(id, update_data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/api/v1/release-requests/{id}/submit", response_model=ReleaseRequestResponse)
async def submit_release_request(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        return ReleaseService.submit_release_request(id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/api/v1/release-requests/{id}/cancel", response_model=ReleaseRequestResponse)
async def cancel_release_request(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        return ReleaseService.cancel_release_request(id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==============================================================================
# 3. ELIGIBILITY CHECKLIST
# ==============================================================================

@router.get("/api/v1/release-requests/{id}/checklist", response_model=List[ChecklistItemResponse])
async def get_release_checklist(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    req = ReleaseService.get_release_request(id)
    if not req:
        raise HTTPException(status_code=404, detail="Release request not found.")
    return ReleaseService.get_checklist_items(id)

@router.patch("/api/v1/release-requests/{id}/checklist/{item_id}", response_model=ChecklistItemResponse)
async def update_release_checklist_item(
    id: str,
    item_id: str,
    update_data: ChecklistItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role == "institution_user":
        raise HTTPException(status_code=403, detail="Forbidden: Only regulatory officers can verify checklist items.")
    try:
        return ReleaseService.update_checklist_item(id, item_id, update_data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==============================================================================
# 4. REVIEWS & DECISIONS
# ==============================================================================

@router.get("/api/v1/release-requests/{id}/reviews", response_model=List[ReleaseReviewResponse])
async def get_release_reviews(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    req = ReleaseService.get_release_request(id)
    if not req:
        raise HTTPException(status_code=404, detail="Release request not found.")
    detail = ReleaseService.get_release_request_detail(id, _get_fdr)
    return detail.get("reviews", [])

@router.post("/api/v1/release-requests/{id}/reviews", response_model=ReleaseReviewResponse, status_code=status.HTTP_201_CREATED)
async def submit_release_review(
    id: str,
    review_data: ReleaseReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role == "institution_user":
        raise HTTPException(status_code=403, detail="Forbidden: Only regulatory officers can submit reviews.")
    try:
        return ReleaseService.add_review(id, review_data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/api/v1/release-requests/{id}/return", response_model=ReleaseReviewResponse)
async def return_request_for_correction(
    id: str,
    payload: ReleaseRequestReturn,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role == "institution_user":
        raise HTTPException(status_code=403, detail="Forbidden: Only regulatory officers can return requests.")
    try:
        return ReleaseService.return_request_for_correction(id, payload.comments, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/api/v1/release-requests/{id}/approve", response_model=ReleaseReviewResponse)
async def approve_release_request(
    id: str,
    payload: ReleaseRequestDecision,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role not in ("system_admin", "bureau_officer"):
        raise HTTPException(status_code=403, detail="Forbidden: Only authorized bureau officers or admins can approve release.")
    try:
        return ReleaseService.approve_request(id, payload.comments, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/api/v1/release-requests/{id}/reject", response_model=ReleaseReviewResponse)
async def reject_release_request(
    id: str,
    payload: ReleaseRequestDecision,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role not in ("system_admin", "bureau_officer", "regional_officer"):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges to reject release.")
    try:
        return ReleaseService.reject_request(id, payload.comments, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

# ==============================================================================
# 5. BANK RELEASE TRACKING
# ==============================================================================

@router.post("/api/v1/release-requests/{id}/release-instruction", response_model=BankReleaseRecordResponse)
async def prepare_release_instruction(
    id: str,
    instruction_data: ReleaseInstructionCreate,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role == "institution_user":
        raise HTTPException(status_code=403, detail="Forbidden: Only regulatory officers can prepare release instructions.")
    try:
        return ReleaseService.prepare_release_instruction(id, instruction_data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/v1/release-requests/{id}/bank-status", response_model=BankReleaseRecordResponse)
async def get_bank_release_status(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    detail = ReleaseService.get_release_request_detail(id, _get_fdr)
    if not detail or not detail.get("bank_release"):
        raise HTTPException(status_code=404, detail="Bank release record not found.")
    return detail["bank_release"]

@router.post("/api/v1/release-requests/{id}/bank-confirmation", response_model=BankReleaseRecordResponse)
async def record_bank_confirmation(
    id: str,
    confirmation: BankConfirmationCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        return ReleaseService.record_bank_confirmation(id, confirmation, current_user, _update_fdr_lifecycle)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==============================================================================
# 6. REFUND MANAGEMENT & RECONCILIATION
# ==============================================================================

@router.get("/api/v1/release-requests/{id}/refunds", response_model=RefundRecordResponse)
async def get_refund_record(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    rf = ReleaseService.get_refund_record(id)
    if not rf:
        raise HTTPException(status_code=404, detail="Refund record not found.")
    return rf

@router.post("/api/v1/release-requests/{id}/refunds", response_model=RefundTransactionResponse, status_code=status.HTTP_201_CREATED)
async def record_refund_transaction(
    id: str,
    tx_data: RefundTransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role not in ("system_admin", "finance_officer", "bureau_officer"):
        raise HTTPException(status_code=403, detail="Forbidden: Only finance officers or admins can record refunds.")
    try:
        return ReleaseService.record_refund_transaction(id, tx_data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/v1/release-requests/{id}/reconciliation", response_model=RefundRecordResponse)
async def reconcile_refund(
    id: str,
    payload: RefundReconciliationCreate,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role not in ("system_admin", "finance_officer"):
        raise HTTPException(status_code=403, detail="Forbidden: Only finance officers can reconcile refunds.")
    try:
        ReleaseService.reconcile_refund(id, payload, current_user)
        return ReleaseService.get_refund_record(id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==============================================================================
# 7. FINAL CLOSURE & AUDIT HISTORY
# ==============================================================================

@router.post("/api/v1/release-requests/{id}/close", response_model=ReleaseClosureResponse)
async def close_release_request(
    id: str,
    closure_data: ReleaseClosureCreate,
    current_user: dict = Depends(get_current_user)
):
    role = _get_user_role(current_user)
    current_user["role"] = role
    if role not in ("system_admin", "bureau_officer"):
        raise HTTPException(status_code=403, detail="Forbidden: Only bureau officers or admins can execute final closure.")
    try:
        return ReleaseService.close_release_request(id, closure_data, current_user, _update_fdr_lifecycle)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/v1/release-requests/{id}/history", response_model=ReleaseRequestDetailResponse)
async def get_release_request_history(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    req = ReleaseService.get_release_request_detail(id, _get_fdr)
    if not req:
        raise HTTPException(status_code=404, detail="Release request not found.")
    return req
