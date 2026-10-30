import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from app.auth.dependencies import get_current_user
from app.services.compliance_service import compliance_service
from app.services.fdr_service import LOCAL_FDR_STORE
from app.schemas.phase7 import (
    ComplianceTemplateCreate,
    ComplianceTemplateUpdate,
    ComplianceTemplateResponse,
    ComplianceDocumentGenerateRequest,
    ComplianceDocumentDraftUpdate,
    ComplianceDocumentResponse,
    ComplianceDocumentDetailResponse,
    ComplianceDocumentReviewRequest,
    MockSignRequest,
    MockSignResponse,
    ComplianceDocumentVersionItem
)

router = APIRouter(prefix="/api/v1/compliance", tags=["Compliance Document Management (Phase 7)"])
logger = logging.getLogger("fdr_chain.compliance_router")

SAMPLE_INSTITUTIONS_MAP = {
    'inst-01': {'id': 'inst-01', 'name': 'National Highways Authority of India', 'code': 'INST-NHAI', 'address': 'G-5 & 6, Sector-10, Dwarka, New Delhi - 110075', 'region_name': 'Northern Region'},
    'inst-02': {'id': 'inst-02', 'name': 'Central Public Works Department', 'code': 'INST-CPWD', 'address': 'Nirman Bhawan, New Delhi - 110011', 'region_name': 'Northern Region'},
    'inst-03': {'id': 'inst-03', 'name': 'Bharat Heavy Electricals Limited', 'code': 'INST-BHEL', 'address': 'BHEL House, Siri Fort, New Delhi - 110049', 'region_name': 'Northern Region'},
    'inst-04': {'id': 'inst-04', 'name': 'Defence Research and Development Organisation', 'code': 'INST-DRDO', 'address': 'DRDO Bhawan, Rajaji Marg, New Delhi - 110011', 'region_name': 'Northern Region'},
}

# ==============================================================================
# 1. TEMPLATE ENDPOINTS
# ==============================================================================

@router.get("/templates", response_model=List[ComplianceTemplateResponse])
async def list_compliance_templates(
    active_only: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """
    Lists compliance letter and report templates.
    """
    return compliance_service.list_templates(active_only=active_only)

@router.post("/templates", response_model=ComplianceTemplateResponse)
async def create_compliance_template(
    payload: ComplianceTemplateCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Creates a new compliance template. Restricted to System Admin and Bureau Officers.
    """
    user_roles = current_user.get("roles", [])
    if "system_admin" not in user_roles and "bureau_officer" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only System Administrators and Bureau Officers can create compliance templates."
        )
    return compliance_service.create_template(payload, user_id=current_user.get("id"))

@router.patch("/templates/{template_id}", response_model=ComplianceTemplateResponse)
async def update_compliance_template(
    template_id: str,
    payload: ComplianceTemplateUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Updates an existing template. Increments template version.
    """
    user_roles = current_user.get("roles", [])
    if "system_admin" not in user_roles and "bureau_officer" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only System Administrators and Bureau Officers can modify compliance templates."
        )
    try:
        return compliance_service.update_template(template_id, payload)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

# ==============================================================================
# 2. DOCUMENT GENERATION & LIFECYCLE
# ==============================================================================

@router.post("/documents/generate", response_model=ComplianceDocumentResponse)
async def generate_compliance_document(
    payload: ComplianceDocumentGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generates a pre-filled compliance letter or audit summary from FDR and institution records.
    """
    inst = SAMPLE_INSTITUTIONS_MAP.get(payload.institution_id) or {
        'id': payload.institution_id,
        'name': 'Declared Educational Institution',
        'code': 'INST-DEFAULT',
        'address': 'Main Institutional Campus',
        'region_name': 'National Jurisdiction'
    }

    fdr = None
    if payload.fdr_id:
        fdr = next((f for f in LOCAL_FDR_STORE if f.get('id') == payload.fdr_id), None)
        if not fdr:
            # Fallback mock FDR
            fdr = {
                'id': payload.fdr_id,
                'fdr_number': 'FDR-2026-MOCK-99120',
                'amount': 2500000.0,
                'bank_name': 'State Bank of India',
                'branch_name': 'New Delhi Main',
                'ifsc_code': 'SBIN0000691',
                'issue_date': '2026-01-01',
                'maturity_date': '2027-01-01',
                'lien_in_favour': 'AICTE'
            }

    try:
        return compliance_service.generate_document(
            payload=payload,
            institution_record=inst,
            fdr_record=fdr,
            user_id=current_user.get("id")
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/documents", response_model=List[ComplianceDocumentResponse])
async def list_compliance_documents(
    institution_id: Optional[str] = Query(None),
    fdr_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Lists compliance documents with role and institution authorization applied.
    """
    user_roles = current_user.get("roles", [])
    if "institution_user" in user_roles and "system_admin" not in user_roles:
        institution_id = current_user.get("institution_id") or institution_id

    return compliance_service.list_documents(
        institution_id=institution_id,
        fdr_id=fdr_id,
        status=status
    )

@router.get("/documents/{doc_id}", response_model=ComplianceDocumentDetailResponse)
async def get_compliance_document_detail(doc_id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieves full compliance document details, content snapshot, reviews and version timeline.
    """
    try:
        return compliance_service.get_document(doc_id)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.patch("/documents/{doc_id}", response_model=ComplianceDocumentResponse)
async def edit_compliance_draft(
    doc_id: str,
    payload: ComplianceDocumentDraftUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Edits draft text content. Automatically creates an incremented version snapshot.
    """
    try:
        return compliance_service.update_draft(doc_id, payload, user_id=current_user.get("id"))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/documents/{doc_id}/submit-review", response_model=ComplianceDocumentResponse)
async def submit_document_for_review(doc_id: str, current_user: dict = Depends(get_current_user)):
    """
    Submits a draft document for supervisory review.
    """
    try:
        return compliance_service.submit_for_review(doc_id, user_id=current_user.get("id"))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/documents/{doc_id}/review", response_model=ComplianceDocumentResponse)
async def review_compliance_document(
    doc_id: str,
    payload: ComplianceDocumentReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Reviews a submitted document (approved or returned for correction). Restricted to Supervisory Officers.
    """
    user_roles = current_user.get("roles", [])
    if not any(r in user_roles for r in ("system_admin", "bureau_officer", "regional_officer")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supervisory officers can approve or return compliance documents."
        )

    try:
        return compliance_service.review_document(doc_id, payload, user_id=current_user.get("id"))
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/documents/{doc_id}/finalize")
async def finalize_document_pdf(doc_id: str, current_user: dict = Depends(get_current_user)):
    """
    Converts an approved document into a finalized PDF with government branding.
    """
    try:
        pdf_bytes = compliance_service.finalize_pdf(doc_id, user_id=current_user.get("id"))
        return {
            "status": "finalized",
            "document_id": doc_id,
            "pdf_url": f"/api/v1/compliance/documents/{doc_id}/pdf",
            "size_bytes": len(pdf_bytes)
        }
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/documents/{doc_id}/pdf")
async def download_compliance_pdf(doc_id: str, current_user: dict = Depends(get_current_user)):
    """
    Downloads the finalized PDF binary for the compliance document.
    """
    if doc_id not in compliance_service.documents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {doc_id} not found.")

    pdf_bytes = compliance_service.pdf_blobs.get(doc_id)
    if not pdf_bytes:
        # Generate on demand if approved
        pdf_bytes = compliance_service.finalize_pdf(doc_id, user_id=current_user.get("id"))

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{doc_id}.pdf"'}
    )

@router.post("/documents/{doc_id}/mock-sign", response_model=MockSignResponse)
async def mock_sign_compliance_document(
    doc_id: str,
    payload: MockSignRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Demonstrates simulated e-signing with a clear simulation disclaimer:
    'DEMO — NOT A LEGALLY VALID DIGITAL SIGNATURE'.
    """
    try:
        return compliance_service.mock_sign(
            doc_id=doc_id,
            payload=payload,
            user_id=current_user.get("id", "usr-demo-01")
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/documents/{doc_id}/versions", response_model=List[ComplianceDocumentVersionItem])
async def get_document_version_history(doc_id: str, current_user: dict = Depends(get_current_user)):
    """
    Returns immutable version history and content snapshots for audit purposes.
    """
    if doc_id not in compliance_service.documents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {doc_id} not found.")
    return compliance_service.versions.get(doc_id, [])
