-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 2: FDR Repository & Document Management Schema
-- ==============================================================================

-- 1. ENUMERATIONS FOR FDR LIFECYCLE, TRUST TIERS, AND VERIFICATIONS
DROP TYPE IF EXISTS fdr_lifecycle_enum CASCADE;
DROP TYPE IF EXISTS fdr_verification_enum CASCADE;
DROP TYPE IF EXISTS fdr_heartbeat_enum CASCADE;
DROP TYPE IF EXISTS document_type_enum CASCADE;

CREATE TYPE fdr_lifecycle_enum AS ENUM (
    'pending',            -- Initial state after institutional submission
    'active',             -- Confirmed and active security deposit
    'under_review',       -- Clarification requested or pending resolution
    'matured',            -- Reached or passed maturity date
    'released',           -- Released back to depositor upon contract completion
    'invoked'             -- Invoked/encashed by beneficiary
);

CREATE TYPE fdr_verification_enum AS ENUM (
    'institution_declared', -- Tier 1: Declared by institution, not bank verified
    'bank_verified',        -- Future Phase 2/3: Confirmed with bank digital signature
    'discrepancy_flagged',  -- Mismatch reported during audit
    'rejected'              -- Rejected due to counterfeit or invalid parameters
);

CREATE TYPE fdr_heartbeat_enum AS ENUM (
    'not_started',          -- Initial Phase 2 state
    'healthy',              -- Active heartbeat confirmed
    'attention_required',   -- Verification overdue or approaching maturity
    'expired'               -- Deposit expired or unacknowledged
);

CREATE TYPE document_type_enum AS ENUM (
    'original_fdr',         -- Mandatory scan/e-receipt of the FDR
    'supporting_document',  -- Contract agreement, sanction letter, tender copy
    'lien_letter',          -- Formal letter noting lien in favour of the department
    'other'                 -- General institutional attachments
);


-- ==============================================================================
-- 2. FDRS TABLE (Fixed Deposit Receipts Central Registry)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fdrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.bank_branches(id) ON DELETE RESTRICT,
    fdr_number VARCHAR(100) NOT NULL,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    issue_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    interest_rate NUMERIC(5,2) CHECK (interest_rate >= 0 AND interest_rate <= 100),
    lien_in_favour VARCHAR(255) NOT NULL,
    lifecycle_status fdr_lifecycle_enum NOT NULL DEFAULT 'pending',
    trust_tier INT NOT NULL DEFAULT 1 CHECK (trust_tier IN (1, 2, 3)),
    verification_status fdr_verification_enum NOT NULL DEFAULT 'institution_declared',
    heartbeat_status fdr_heartbeat_enum NOT NULL DEFAULT 'not_started',
    remarks TEXT,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent duplicate FDR numbers lodged for the same bank
    CONSTRAINT uq_bank_fdr_number UNIQUE (bank_id, fdr_number),
    -- Ensure maturity date is strictly after issue date
    CONSTRAINT chk_maturity_after_issue CHECK (maturity_date > issue_date)
);

CREATE INDEX IF NOT EXISTS idx_fdrs_institution ON public.fdrs(institution_id);
CREATE INDEX IF NOT EXISTS idx_fdrs_bank ON public.fdrs(bank_id);
CREATE INDEX IF NOT EXISTS idx_fdrs_branch ON public.fdrs(branch_id);
CREATE INDEX IF NOT EXISTS idx_fdrs_fdr_number ON public.fdrs(fdr_number);
CREATE INDEX IF NOT EXISTS idx_fdrs_lifecycle ON public.fdrs(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_fdrs_trust_tier ON public.fdrs(trust_tier);
CREATE INDEX IF NOT EXISTS idx_fdrs_maturity ON public.fdrs(maturity_date);
CREATE INDEX IF NOT EXISTS idx_fdrs_created_at ON public.fdrs(created_at DESC);


-- ==============================================================================
-- 3. DOCUMENTS TABLE (Secure Document Metadata & Integrity)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    document_type document_type_enum NOT NULL DEFAULT 'original_fdr',
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    sha256_checksum VARCHAR(64) NOT NULL, -- SHA-256 file integrity checksum
    description TEXT,
    uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_documents_fdr ON public.documents(fdr_id);
CREATE INDEX IF NOT EXISTS idx_documents_institution ON public.documents(institution_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);


-- ==============================================================================
-- 4. FDR EVENTS TABLE (Audit Trail & Activity History)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fdr_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL, -- 'fdr_registered', 'fdr_updated', 'document_uploaded', etc.
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fdr_events_fdr ON public.fdr_events(fdr_id);
CREATE INDEX IF NOT EXISTS idx_fdr_events_created_at ON public.fdr_events(created_at DESC);


-- ==============================================================================
-- TRIGGER FOR AUTOMATIC UPDATED_AT ON FDRS
-- ==============================================================================
CREATE TRIGGER trg_fdrs_updated_at
    BEFORE UPDATE ON public.fdrs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
