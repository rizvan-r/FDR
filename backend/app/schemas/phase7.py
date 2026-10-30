from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==============================================================================
# MODULE A: LEGACY DATA MIGRATION SCHEMAS
# ==============================================================================

class ColumnMappingItem(BaseModel):
    source_column: str
    target_field: str

class ColumnMappingRequest(BaseModel):
    mappings: List[ColumnMappingItem]
    save_as_profile: Optional[str] = None

class MigrationRowReviewRequest(BaseModel):
    action: str = Field(..., description="'exclude', 'correct', or 'approve'")
    corrected_data: Optional[Dict[str, Any]] = None
    review_note: Optional[str] = None

class MigrationImportRequest(BaseModel):
    include_reviewed_only: Optional[bool] = False
    skip_fuzzy_duplicates: Optional[bool] = True

class MigrationBatchSummary(BaseModel):
    id: str
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None
    file_name: str
    file_type: str
    batch_status: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    imported_rows: int
    skipped_rows: int
    created_at: str
    completed_at: Optional[str] = None

class MigrationRowItem(BaseModel):
    id: str
    batch_id: str
    row_number: int
    source_data: Dict[str, Any]
    normalized_data: Dict[str, Any]
    validation_status: str
    validation_errors: List[Dict[str, Any]] = []
    duplicate_candidates: List[Dict[str, Any]] = []
    matched_institution_id: Optional[str] = None
    matched_institution_name: Optional[str] = None
    matched_bank_id: Optional[str] = None
    matched_bank_name: Optional[str] = None
    matched_branch_id: Optional[str] = None
    matched_branch_name: Optional[str] = None
    reviewed_by: Optional[str] = None
    review_note: Optional[str] = None
    imported_fdr_id: Optional[str] = None

class MigrationBatchDetail(MigrationBatchSummary):
    mappings: List[ColumnMappingItem] = []
    rows: List[MigrationRowItem] = []
    preview_data: List[Dict[str, Any]] = []
    headers: List[str] = []

class MigrationMappingProfileResponse(BaseModel):
    id: str
    profile_name: str
    institution_id: Optional[str] = None
    column_mapping: Dict[str, str]
    created_at: str

# ==============================================================================
# MODULE B: COMPLIANCE DOCUMENT SCHEMAS
# ==============================================================================

class ComplianceTemplateCreate(BaseModel):
    template_name: str
    template_type: str
    description: Optional[str] = None
    template_content: str
    is_active: Optional[bool] = True

class ComplianceTemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    description: Optional[str] = None
    template_content: Optional[str] = None
    is_active: Optional[bool] = None

class ComplianceTemplateResponse(BaseModel):
    id: str
    template_name: str
    template_type: str
    description: Optional[str] = None
    template_content: str
    version: int
    is_active: bool
    created_at: str
    updated_at: str

class ComplianceDocumentGenerateRequest(BaseModel):
    template_id: str
    institution_id: str
    fdr_id: Optional[str] = None
    custom_title: Optional[str] = None
    variable_overrides: Optional[Dict[str, Any]] = None

class ComplianceDocumentDraftUpdate(BaseModel):
    document_title: Optional[str] = None
    content_text: str

class ComplianceDocumentReviewRequest(BaseModel):
    action: str = Field(..., description="'approved' or 'returned_for_correction'")
    comments: str

class MockSignRequest(BaseModel):
    signer_display_name: str
    consent_acknowledged: bool

class MockSignResponse(BaseModel):
    signature_reference: str
    signer_display_name: str
    signed_at: str
    disclaimer: str
    status: str

class ComplianceDocumentVersionItem(BaseModel):
    id: str
    compliance_document_id: str
    version_number: int
    content_snapshot: Dict[str, Any]
    storage_path: Optional[str] = None
    content_hash: str
    created_by: Optional[str] = None
    created_at: str

class ComplianceDocumentResponse(BaseModel):
    id: str
    institution_id: str
    institution_name: Optional[str] = None
    fdr_id: Optional[str] = None
    fdr_number: Optional[str] = None
    template_id: str
    template_name: Optional[str] = None
    document_title: str
    document_type: str
    document_status: str
    current_version: int
    content_text: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    reviewed_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    pdf_url: Optional[str] = None
    mock_signature: Optional[MockSignResponse] = None
    created_at: str
    updated_at: str

class ComplianceDocumentDetailResponse(ComplianceDocumentResponse):
    versions: List[ComplianceDocumentVersionItem] = []
    reviews: List[Dict[str, Any]] = []
