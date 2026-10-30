import logging
import uuid
import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from app.auth.dependencies import get_current_user
from app.services.migration_service import migration_service
from app.services.fdr_service import fdr_service, LOCAL_FDR_STORE
from app.schemas.phase7 import (
    MigrationBatchSummary,
    MigrationBatchDetail,
    MigrationRowItem,
    ColumnMappingRequest,
    ColumnMappingItem,
    MigrationRowReviewRequest,
    MigrationImportRequest,
    MigrationMappingProfileResponse
)

router = APIRouter(prefix="/api/v1/migrations", tags=["Legacy Data Migration (Phase 7)"])
logger = logging.getLogger("fdr_chain.migrations_router")

# Sample institutions and banks for matching
SAMPLE_INSTITUTIONS = [
    {'id': 'inst-01', 'name': 'National Highways Authority of India', 'code': 'INST-NHAI'},
    {'id': 'inst-02', 'name': 'Central Public Works Department', 'code': 'INST-CPWD'},
    {'id': 'inst-03', 'name': 'Bharat Heavy Electricals Limited', 'code': 'INST-BHEL'},
    {'id': 'inst-04', 'name': 'Defence Research and Development Organisation', 'code': 'INST-DRDO'},
    {'id': 'inst-05', 'name': 'Indian Institute of Technology Delhi', 'code': 'INST-IITD'},
]

SAMPLE_BANKS = [
    {'id': 'bank-01', 'name': 'State Bank of India', 'code': 'SBIN'},
    {'id': 'bank-02', 'name': 'Punjab National Bank', 'code': 'PUNB'},
    {'id': 'bank-03', 'name': 'Bank of Baroda', 'code': 'BARB'},
    {'id': 'bank-04', 'name': 'Canara Bank', 'code': 'CNRB'},
    {'id': 'bank-05', 'name': 'HDFC Bank', 'code': 'HDFC'},
    {'id': 'bank-06', 'name': 'ICICI Bank', 'code': 'ICIC'},
]

@router.post("/upload", response_model=MigrationBatchSummary)
async def upload_migration_file(
    file: UploadFile = File(...),
    institution_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Uploads a legacy migration spreadsheet (.csv or .xlsx) and prepares it for column mapping.
    """
    filename = file.filename or "migration.csv"
    if not (filename.lower().endswith(".csv") or filename.lower().endswith((".xlsx", ".xls"))):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a .csv or .xlsx spreadsheet."
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded spreadsheet file is empty (0 bytes)."
        )
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum permitted legacy upload limit of 15MB."
        )

    # Scoping check: if institution_user, enforce their institution_id
    user_roles = current_user.get("roles", [])
    if "institution_user" in user_roles:
        user_inst = current_user.get("institution_id")
        if institution_id and institution_id != user_inst:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Institution users can only upload migration files for their registered institution."
            )
        institution_id = user_inst or institution_id

    try:
        batch = migration_service.create_batch(
            filename=filename,
            content=content,
            institution_id=institution_id,
            user_id=current_user.get("id")
        )
        return batch
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to process migration upload: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to parse spreadsheet: {str(e)}")

@router.get("", response_model=List[MigrationBatchSummary])
async def list_migration_batches(current_user: dict = Depends(get_current_user)):
    """
    Lists all migration batches within user's authorized scope.
    """
    batches = list(migration_service.batches.values())
    user_roles = current_user.get("roles", [])
    if "institution_user" in user_roles and "system_admin" not in user_roles:
        inst_id = current_user.get("institution_id")
        batches = [b for b in batches if b.get("institution_id") == inst_id]
    return batches

@router.get("/profiles", response_model=List[MigrationMappingProfileResponse])
async def list_mapping_profiles(current_user: dict = Depends(get_current_user)):
    """
    Lists saved column mapping profiles.
    """
    return list(migration_service.profiles.values())

@router.get("/{batch_id}", response_model=MigrationBatchDetail)
async def get_migration_batch_detail(batch_id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieves full details of a migration batch including headers, mappings, rows and preview.
    """
    if batch_id not in migration_service.batches:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Migration batch {batch_id} not found.")

    batch = migration_service.batches[batch_id]
    user_roles = current_user.get("roles", [])
    if "institution_user" in user_roles and "system_admin" not in user_roles:
        if batch.get("institution_id") != current_user.get("institution_id"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to batch from another institution.")

    mappings = migration_service.mappings.get(batch_id, [])
    rows = migration_service.rows.get(batch_id, [])
    headers = batch.get("headers", [])
    preview_data = batch.get("preview_data", [])

    return {
        **batch,
        "mappings": mappings,
        "rows": rows,
        "headers": headers,
        "preview_data": preview_data
    }

@router.get("/{batch_id}/preview")
async def get_migration_preview(batch_id: str, current_user: dict = Depends(get_current_user)):
    """
    Returns raw preview rows and detected headers.
    """
    if batch_id not in migration_service.batches:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Migration batch {batch_id} not found.")
    batch = migration_service.batches[batch_id]
    return {
        "headers": batch.get("headers", []),
        "preview_rows": batch.get("preview_data", []),
        "suggested_mappings": migration_service.mappings.get(batch_id, [])
    }

@router.post("/{batch_id}/mapping", response_model=List[ColumnMappingItem])
async def set_column_mappings(
    batch_id: str,
    payload: ColumnMappingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Applies custom column mappings to the batch and optionally saves as a reusable profile.
    """
    try:
        return migration_service.set_mappings(
            batch_id=batch_id,
            mappings=payload.mappings,
            save_as_profile=payload.save_as_profile,
            user_id=current_user.get("id")
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/{batch_id}/validate")
async def validate_migration_batch(batch_id: str, current_user: dict = Depends(get_current_user)):
    """
    Normalizes spreadsheet values, validates FDR fields, and checks for duplicates.
    """
    try:
        # Fetch current FDR store for duplicate detection
        existing_fdrs = LOCAL_FDR_STORE
        return migration_service.validate_batch(
            batch_id=batch_id,
            existing_fdrs=existing_fdrs,
            existing_banks=SAMPLE_BANKS,
            existing_institutions=SAMPLE_INSTITUTIONS
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{batch_id}/errors", response_model=List[MigrationRowItem])
async def get_validation_errors(batch_id: str, current_user: dict = Depends(get_current_user)):
    """
    Returns only rows that have validation errors, duplicate warnings, or need review.
    """
    if batch_id not in migration_service.batches:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Migration batch {batch_id} not found.")
    rows = migration_service.rows.get(batch_id, [])
    error_rows = [
        r for r in rows
        if r['validation_status'] in ('invalid', 'duplicate_exact', 'duplicate_fuzzy') or len(r.get('validation_errors', [])) > 0
    ]
    return error_rows

@router.post("/{batch_id}/rows/{row_id}/review", response_model=MigrationRowItem)
async def review_migration_row(
    batch_id: str,
    row_id: str,
    payload: MigrationRowReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Allows authorized officers to review, correct, approve, or exclude a problematic row.
    """
    try:
        return migration_service.review_row(
            batch_id=batch_id,
            row_id=row_id,
            action=payload.action,
            corrected_data=payload.corrected_data,
            review_note=payload.review_note,
            user_id=current_user.get("id")
        )
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/{batch_id}/import")
async def execute_batch_import(
    batch_id: str,
    payload: MigrationImportRequest = MigrationImportRequest(),
    current_user: dict = Depends(get_current_user)
):
    """
    Imports eligible spreadsheet rows into the Central FDR Vault as Tier 1 pending records.
    Idempotent operation: does not recreate already imported FDRs.
    """
    def _create_fdr(fdr_payload: Dict[str, Any]):
        # Call into fdr_service to create new FDR record
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        now_iso = now_dt.isoformat()
        new_fdr = dict(fdr_payload)
        new_fdr['id'] = f"fdr-{uuid.uuid4().hex[:6]}"
        if not new_fdr.get('branch_id'):
            new_fdr['branch_id'] = '00000000-0000-0000-0000-000000000001'
        new_fdr['created_at'] = now_iso
        new_fdr['updated_at'] = now_iso
        new_fdr['institution_name'] = new_fdr.get('institution_name') or 'National Highways Authority of India'
        new_fdr['bank_name'] = new_fdr.get('bank_name') or 'State Bank of India'
        new_fdr['branch_name'] = new_fdr.get('branch_name') or 'SBI Main Branch'
        new_fdr['documents'] = []
        new_fdr['events'] = []
        LOCAL_FDR_STORE.append(new_fdr)
        return new_fdr

    try:
        result = migration_service.execute_import(
            batch_id=batch_id,
            create_fdr_callback=_create_fdr,
            user_id=current_user.get("id"),
            skip_fuzzy=payload.skip_fuzzy_duplicates if payload.skip_fuzzy_duplicates is not None else True
        )
        return result
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Import execution error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Import execution failed: {str(e)}")

@router.post("/{batch_id}/cancel")
async def cancel_migration_batch(batch_id: str, current_user: dict = Depends(get_current_user)):
    """
    Cancels an incomplete migration batch.
    """
    if batch_id not in migration_service.batches:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Migration batch {batch_id} not found.")
    batch = migration_service.batches[batch_id]
    batch['batch_status'] = 'cancelled'
    return {"status": "cancelled", "batch_id": batch_id}

@router.get("/{batch_id}/report")
async def get_migration_batch_report(batch_id: str, current_user: dict = Depends(get_current_user)):
    """
    Generates batch summary report including imported counts, skipped reasons, and total value.
    """
    if batch_id not in migration_service.batches:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Migration batch {batch_id} not found.")

    batch = migration_service.batches[batch_id]
    rows = migration_service.rows.get(batch_id, [])

    total_value = sum(
        float(r.get('normalized_data', {}).get('amount', 0))
        for r in rows
        if r['validation_status'] == 'imported'
    )

    bank_counts: Dict[str, int] = {}
    for r in rows:
        if r['validation_status'] == 'imported':
            b_name = r.get('matched_bank_name') or r.get('normalized_data', {}).get('bank_name', 'Unknown')
            bank_counts[b_name] = bank_counts.get(b_name, 0) + 1

    return {
        "batch_id": batch_id,
        "file_name": batch['file_name'],
        "status": batch['batch_status'],
        "total_rows": batch['total_rows'],
        "imported_rows": batch['imported_rows'],
        "skipped_rows": batch['skipped_rows'],
        "total_collateral_value": total_value,
        "bank_distribution": bank_counts,
        "completed_at": batch['completed_at']
    }
