import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import JSONResponse, Response
from app.auth.dependencies import get_current_user
from app.schemas.fdr import (
    FDRCreateRequest,
    FDRUpdateRequest,
    FDRResponse,
    FDRListResponse,
    FDRSummaryStats,
    DocumentResponse,
    FDREventResponse
)
from app.services.fdr_service import fdr_service

router = APIRouter(prefix="/api/v1", tags=["FDR Repository & Documents (Phase 2)"])
logger = logging.getLogger("fdr_chain.fdrs_router")

@router.get("/fdrs/stats", response_model=FDRSummaryStats)
async def get_fdr_summary_stats(current_user: dict = Depends(get_current_user)):
    """
    Returns authentic aggregate statistics across institutional FDR records.
    """
    return fdr_service.get_summary_stats(current_user)

@router.get("/fdrs", response_model=FDRListResponse)
async def list_fdrs(
    search: Optional[str] = Query(None, description="Search by FDR number, institution or bank"),
    bank_id: Optional[str] = Query(None),
    institution_id: Optional[str] = Query(None),
    lifecycle_status: Optional[str] = Query(None),
    trust_tier: Optional[int] = Query(None),
    region_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Lists FDR repository records with authorization scope applied according to user role.
    """
    return fdr_service.get_fdrs(
        current_user=current_user,
        search=search,
        bank_id=bank_id,
        institution_id=institution_id,
        lifecycle_status=lifecycle_status,
        trust_tier=trust_tier,
        region_id=region_id,
        page=page,
        page_size=page_size
    )

@router.get("/fdrs/{fdr_id}", response_model=FDRResponse)
async def get_fdr_detail(
    fdr_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves full details for a specific FDR including documents and events history.
    """
    return fdr_service.get_fdr_by_id(fdr_id, current_user)

@router.post("/fdrs", response_model=FDRResponse, status_code=status.HTTP_201_CREATED)
async def register_fdr(
    fdr_data: FDRCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Registers a new institutional FDR.
    Enforces initial Trust Tier 1 (institution declared, not bank verified).
    Auto-derives institution_id from the authenticated user profile.
    """
    user_roles = current_user.get("roles", [])
    allowed_roles = ["system_admin", "institution_user", "bureau_officer"]
    if not any(r in allowed_roles for r in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your current role does not have permission to register FDR records."
        )

    return fdr_service.create_fdr(fdr_data.model_dump(), current_user)

@router.patch("/fdrs/{fdr_id}", response_model=FDRResponse)
async def update_fdr_record(
    fdr_id: str,
    updates: FDRUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Updates permitted fields while the FDR is in pending status.
    Prohibits modifying institution_id, trust_tier, verification_status or lifecycle_status.
    """
    return fdr_service.update_fdr(fdr_id, updates.model_dump(exclude_unset=True), current_user)

@router.get("/fdrs/{fdr_id}/documents", response_model=List[DocumentResponse])
async def list_fdr_documents(
    fdr_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Lists uploaded documents associated with the FDR.
    """
    fdr = fdr_service.get_fdr_by_id(fdr_id, current_user)
    return fdr.get("documents", [])

@router.post("/fdrs/{fdr_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_fdr_document(
    fdr_id: str,
    file: UploadFile = File(...),
    document_type: str = Form("original_fdr"),
    description: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Uploads an FDR document (PDF, JPEG, PNG, max 10MB), computes SHA-256 checksum,
    and logs the audit event.
    """
    return await fdr_service.upload_document(
        fdr_id=fdr_id,
        file=file,
        document_type=document_type,
        description=description,
        current_user=current_user
    )

@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Authorized document download endpoint.
    """
    # Find document across store
    for fdr in fdr_service.get_fdrs(current_user, page_size=1000)["items"]:
        for doc in fdr.get("documents", []):
            if str(doc["id"]) == document_id:
                # Return JSON response containing signed download URL or file metadata
                return {
                    "document_id": doc["id"],
                    "filename": doc["original_filename"],
                    "mime_type": doc["mime_type"],
                    "sha256_checksum": doc["sha256_checksum"],
                    "storage_path": doc["storage_path"],
                    "download_url": f"/storage/v1/object/authenticated/fdr-documents/{doc['storage_path']}"
                }

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

@router.get("/fdrs/{fdr_id}/events", response_model=List[FDREventResponse])
async def list_fdr_events(
    fdr_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Lists complete immutable audit event history for the FDR.
    """
    fdr = fdr_service.get_fdr_by_id(fdr_id, current_user)
    return fdr.get("events", [])
