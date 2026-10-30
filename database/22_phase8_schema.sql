-- ============================================================================
-- FDR-CHAIN ENTERPRISE PLATFORM: PHASE 8 DDL SCHEMA
-- FDR Release, Refund & Closure Management
-- ============================================================================

-- 1. RELEASE POLICY VERSIONS
-- Configurable regulatory release requirements and approval authority matrices
CREATE TABLE IF NOT EXISTS release_policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name TEXT NOT NULL,
    policy_version TEXT NOT NULL UNIQUE,
    policy_description TEXT,
    source_reference TEXT NOT NULL DEFAULT 'AICTE Approval Process Handbook (APH) Statutory Norms',
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_until TIMESTAMPTZ,
    checklist_configuration JSONB NOT NULL DEFAULT '[]'::jsonb,
    approval_configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_release_policies_active ON release_policy_versions(is_active);

-- 2. FDR RELEASE REQUESTS
-- Main case tracking institutional requests for lien release / security deposit return
CREATE TABLE IF NOT EXISTS fdr_release_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT NOT NULL UNIQUE,
    fdr_id UUID NOT NULL REFERENCES fdrs(id) ON DELETE RESTRICT,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    request_reason TEXT NOT NULL,
    request_status TEXT NOT NULL DEFAULT 'draft',
    policy_version_id UUID NOT NULL REFERENCES release_policy_versions(id),
    submitted_at TIMESTAMPTZ,
    current_reviewer_id UUID REFERENCES auth.users(id),
    final_decision_by UUID REFERENCES auth.users(id),
    final_decision_at TIMESTAMPTZ,
    decision_comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_release_request_status CHECK (
        request_status IN (
            'draft',
            'submitted',
            'preliminary_review',
            'eligibility_review',
            'finance_review',
            'authority_review',
            'returned_for_correction',
            'approved',
            'rejected',
            'cancelled',
            'release_initiated',
            'bank_confirmed',
            'closed'
        )
    )
);

-- Partial index to prevent conflicting active release requests for the same FDR
CREATE UNIQUE INDEX IF NOT EXISTS idx_fdr_active_release_req 
ON fdr_release_requests (fdr_id) 
WHERE request_status NOT IN ('rejected', 'cancelled', 'closed');

CREATE INDEX IF NOT EXISTS idx_release_requests_institution ON fdr_release_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_release_requests_status ON fdr_release_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_release_requests_fdr ON fdr_release_requests(fdr_id);

-- 3. RELEASE CHECKLIST ITEMS
-- Configurable compliance and statutory verification line items per release request
CREATE TABLE IF NOT EXISTS release_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_request_id UUID NOT NULL REFERENCES fdr_release_requests(id) ON DELETE CASCADE,
    policy_requirement_key TEXT NOT NULL,
    requirement_title TEXT NOT NULL,
    requirement_description TEXT,
    is_required BOOLEAN NOT NULL DEFAULT true,
    review_status TEXT NOT NULL DEFAULT 'pending',
    evidence_document_id UUID REFERENCES fdr_documents(id),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_checklist_item_status CHECK (
        review_status IN ('pending', 'satisfied', 'not_satisfied', 'not_applicable', 'needs_clarification')
    )
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_request ON release_checklist_items(release_request_id);

-- 4. RELEASE REVIEWS
-- Immutable multi-stage supervisory reviews, recommendations, and decisions
CREATE TABLE IF NOT EXISTS release_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_request_id UUID NOT NULL REFERENCES fdr_release_requests(id) ON DELETE CASCADE,
    review_stage TEXT NOT NULL,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id),
    review_decision TEXT NOT NULL,
    comments TEXT NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_review_stage CHECK (
        review_stage IN ('preliminary_review', 'eligibility_review', 'finance_review', 'authority_review')
    ),
    CONSTRAINT chk_review_decision CHECK (
        review_decision IN ('recommend_approval', 'recommend_rejection', 'return_for_correction', 'approved', 'rejected')
    )
);

CREATE INDEX IF NOT EXISTS idx_release_reviews_request ON release_reviews(release_request_id);

-- 5. BANK RELEASE RECORDS
-- Depository bank lien revocation instructions and verified bank confirmations
CREATE TABLE IF NOT EXISTS bank_release_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_request_id UUID NOT NULL REFERENCES fdr_release_requests(id) ON DELETE RESTRICT,
    fdr_id UUID NOT NULL REFERENCES fdrs(id) ON DELETE RESTRICT,
    bank_id UUID REFERENCES banks(id),
    release_status TEXT NOT NULL DEFAULT 'not_started',
    instruction_reference TEXT,
    bank_reference TEXT,
    bank_confirmation_date TIMESTAMPTZ,
    confirmation_method TEXT,
    evidence_document_id UUID REFERENCES fdr_documents(id),
    confirmed_by UUID REFERENCES auth.users(id),
    is_mock BOOLEAN NOT NULL DEFAULT true,
    disclaimer TEXT NOT NULL DEFAULT 'SIMULATED DEMO — NOT AN ACTUAL BANK MONEY TRANSFER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_bank_release_status CHECK (
        release_status IN (
            'not_started',
            'instruction_prepared',
            'awaiting_bank',
            'released',
            'release_rejected',
            'unconfirmed'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_bank_release_request ON bank_release_records(release_request_id);
CREATE INDEX IF NOT EXISTS idx_bank_release_fdr ON bank_release_records(fdr_id);

-- 6. FDR REFUND RECORDS & TRANSACTIONS
-- Expected vs received deposit amounts, mode of refund, and partial payment ledger
CREATE TABLE IF NOT EXISTS fdr_refund_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_request_id UUID NOT NULL REFERENCES fdr_release_requests(id) ON DELETE RESTRICT,
    fdr_id UUID NOT NULL REFERENCES fdrs(id) ON DELETE RESTRICT,
    expected_amount NUMERIC(15,2) NOT NULL CHECK (expected_amount >= 0),
    received_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    refund_status TEXT NOT NULL DEFAULT 'pending',
    refund_reference TEXT,
    refund_date DATE,
    payment_mode TEXT,
    supporting_document_id UUID REFERENCES fdr_documents(id),
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_refund_status CHECK (
        refund_status IN (
            'not_applicable',
            'pending',
            'partially_received',
            'received',
            'reconciliation_pending',
            'reconciled',
            'disputed'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_refund_records_request ON fdr_refund_records(release_request_id);

CREATE TABLE IF NOT EXISTS fdr_refund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_record_id UUID NOT NULL REFERENCES fdr_refund_records(id) ON DELETE CASCADE,
    transaction_reference TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    payment_mode TEXT NOT NULL,
    utr_number TEXT,
    receipt_document_id UUID REFERENCES fdr_documents(id),
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_transactions_record ON fdr_refund_transactions(refund_record_id);

-- 7. RELEASE CLOSURE RECORDS
-- Final regulatory audit seal, closure evidence, and administrative reconciliation
CREATE TABLE IF NOT EXISTS release_closure_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_request_id UUID NOT NULL REFERENCES fdr_release_requests(id) ON DELETE RESTRICT,
    closure_status TEXT NOT NULL DEFAULT 'pending',
    reconciliation_status TEXT NOT NULL DEFAULT 'reconciliation_pending',
    reconciled_by UUID REFERENCES auth.users(id),
    reconciled_at TIMESTAMPTZ,
    closure_notes TEXT,
    closure_evidence_document_id UUID REFERENCES fdr_documents(id),
    closed_by UUID REFERENCES auth.users(id),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_closure_status CHECK (
        closure_status IN ('pending', 'closed', 'rejected')
    ),
    CONSTRAINT chk_reconciliation_status CHECK (
        reconciliation_status IN ('reconciliation_pending', 'reconciled', 'waived', 'disputed')
    )
);

CREATE INDEX IF NOT EXISTS idx_closure_records_request ON release_closure_records(release_request_id);
