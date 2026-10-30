-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 7: Legacy Data Migration & Compliance Document Management Schema
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- MODULE A: LEGACY DATA MIGRATION TABLES
-- ==============================================================================

-- 1. MIGRATION_MAPPING_PROFILES (Reusable column mapping presets)
CREATE TABLE IF NOT EXISTS public.migration_mapping_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    profile_name VARCHAR(255) NOT NULL,
    column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. MIGRATION_BATCHES (Master upload and batch execution record)
CREATE TABLE IF NOT EXISTS public.migration_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('csv', 'xlsx', 'xls')),
    batch_status VARCHAR(50) NOT NULL DEFAULT 'uploaded' CHECK (batch_status IN (
        'uploaded',
        'mapping',
        'validating',
        'review_required',
        'ready',
        'importing',
        'completed',
        'failed',
        'cancelled'
    )),
    total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    valid_rows INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
    invalid_rows INTEGER NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
    imported_rows INTEGER NOT NULL DEFAULT 0 CHECK (imported_rows >= 0),
    skipped_rows INTEGER NOT NULL DEFAULT 0 CHECK (skipped_rows >= 0),
    mapping_profile_id UUID REFERENCES public.migration_mapping_profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 3. MIGRATION_COLUMN_MAPPINGS (Source to target field bindings per batch)
CREATE TABLE IF NOT EXISTS public.migration_column_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.migration_batches(id) ON DELETE CASCADE,
    source_column VARCHAR(255) NOT NULL,
    target_field VARCHAR(100) NOT NULL CHECK (target_field IN (
        'institution_name',
        'bank_name',
        'branch_name',
        'fdr_number',
        'amount',
        'currency',
        'issue_date',
        'maturity_date',
        'interest_rate',
        'lien_in_favour',
        'remarks'
    )),
    mapping_profile_name VARCHAR(255),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_batch_source_col UNIQUE (batch_id, source_column)
);

-- 4. MIGRATION_ROWS (Row-level raw, normalized, validation, and review state)
CREATE TABLE IF NOT EXISTS public.migration_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.migration_batches(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL CHECK (row_number > 0),
    source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    normalized_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (validation_status IN (
        'pending',
        'valid',
        'invalid',
        'duplicate_exact',
        'duplicate_fuzzy',
        'reviewed',
        'excluded',
        'imported',
        'failed'
    )),
    validation_errors JSONB DEFAULT '[]'::jsonb,
    duplicate_candidates JSONB DEFAULT '[]'::jsonb,
    matched_institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    matched_bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
    matched_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    review_note TEXT,
    imported_fdr_id UUID REFERENCES public.fdrs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_batch_row_num UNIQUE (batch_id, row_number)
);

-- ==============================================================================
-- MODULE B: COMPLIANCE DOCUMENT MANAGEMENT TABLES
-- ==============================================================================

-- 5. COMPLIANCE_TEMPLATES (Configurable template definitions)
CREATE TABLE IF NOT EXISTS public.compliance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(100) NOT NULL CHECK (template_type IN (
        'fdr_confirmation',
        'bank_verification_request',
        'renewal_reminder',
        'missing_document_notice',
        'compliance_clarification',
        'institution_summary_report'
    )),
    description TEXT,
    template_content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. COMPLIANCE_DOCUMENTS (Generated institutional compliance document instances)
CREATE TABLE IF NOT EXISTS public.compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    fdr_id UUID REFERENCES public.fdrs(id) ON DELETE SET NULL,
    template_id UUID NOT NULL REFERENCES public.compliance_templates(id) ON DELETE RESTRICT,
    document_title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (document_status IN (
        'draft',
        'submitted_for_review',
        'under_review',
        'returned_for_correction',
        'approved',
        'finalized',
        'archived'
    )),
    current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version >= 1),
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. COMPLIANCE_DOCUMENT_VERSIONS (Immutable version history with content snapshots)
CREATE TABLE IF NOT EXISTS public.compliance_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_document_id UUID NOT NULL REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number >= 1),
    content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    storage_path TEXT,
    content_hash VARCHAR(64) NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doc_version UNIQUE (compliance_document_id, version_number)
);

-- 8. DOCUMENT_REVIEWS (Official reviews, feedback, and approvals)
CREATE TABLE IF NOT EXISTS public.document_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_document_id UUID NOT NULL REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
    version_id UUID REFERENCES public.compliance_document_versions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    review_status VARCHAR(50) NOT NULL CHECK (review_status IN ('approved', 'returned_for_correction', 'under_review')),
    comments TEXT NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. MOCK_SIGNATURE_RECORDS (Clearly labelled simulated demonstration signatures)
CREATE TABLE IF NOT EXISTS public.mock_signature_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_document_id UUID NOT NULL REFERENCES public.compliance_documents(id) ON DELETE CASCADE,
    version_id UUID REFERENCES public.compliance_document_versions(id) ON DELETE CASCADE,
    signer_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    signer_display_name VARCHAR(150) NOT NULL,
    signature_reference VARCHAR(100) NOT NULL UNIQUE,
    signature_status VARCHAR(50) NOT NULL DEFAULT 'demonstration_only' CHECK (signature_status IN ('demonstration_only', 'revoked')),
    disclaimer TEXT NOT NULL DEFAULT 'DEMO — NOT A LEGALLY VALID DIGITAL SIGNATURE',
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- PERFORMANCE INDICES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_migration_batches_inst ON public.migration_batches(institution_id);
CREATE INDEX IF NOT EXISTS idx_migration_batches_status ON public.migration_batches(batch_status);
CREATE INDEX IF NOT EXISTS idx_migration_rows_batch ON public.migration_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_migration_rows_status ON public.migration_rows(validation_status);
CREATE INDEX IF NOT EXISTS idx_migration_col_maps_batch ON public.migration_column_mappings(batch_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_inst ON public.compliance_documents(institution_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_fdr ON public.compliance_documents(fdr_id);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_status ON public.compliance_documents(document_status);
CREATE INDEX IF NOT EXISTS idx_compliance_doc_vers_doc ON public.compliance_document_versions(compliance_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_reviews_doc ON public.document_reviews(compliance_document_id);
CREATE INDEX IF NOT EXISTS idx_mock_signatures_doc ON public.mock_signature_records(compliance_document_id);
