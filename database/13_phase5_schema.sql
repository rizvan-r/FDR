-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
-- Phase 5: Renewal Management, Matching Engine & FDR Lineage Schema
-- ==============================================================================

-- 1. EXTEND ENUMS
DO $$
BEGIN
    ALTER TYPE fdr_lifecycle_enum ADD VALUE IF NOT EXISTS 'renewed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Renewal Case Status Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'renewal_case_status_enum') THEN
        CREATE TYPE renewal_case_status_enum AS ENUM (
            'draft',             -- Initial creation by institution, draft in progress
            'submitted',         -- Formal submission by institutional user
            'matching',          -- Advisory matching algorithm evaluated candidates
            'evidence_pending',  -- Awaiting upload or confirmation of supporting documents
            'bank_confirmed',    -- Replacement FDR attested by depository bank (Tier 2 or Tier 3)
            'under_review',      -- Active supervisory audit by compliance officer
            'approved',          -- Approved: lineage edge created, parent status -> renewed
            'rejected',          -- Rejected with documented justification note
            'cancelled'          -- Withdrawn by submitting institution prior to decision
        );
    END IF;
END $$;

-- Lineage Relationship Type Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lineage_relationship_type_enum') THEN
        CREATE TYPE lineage_relationship_type_enum AS ENUM (
            'renewal',           -- Standard term renewal of existing deposit security
            'replacement'        -- Replacement deposit (e.g. branch change, bank migration)
        );
    END IF;
END $$;

-- Evidence Type Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'renewal_evidence_type_enum') THEN
        CREATE TYPE renewal_evidence_type_enum AS ENUM (
            'replacement_fdr_copy',          -- Official scanned copy of new replacement FDR
            'bank_renewal_advice',          -- Official renewal confirmation receipt from bank
            'original_fdr_closure',         -- Bank certificate confirming original FDR closure/rollover
            'bank_pledge_confirmation',     -- Fresh lien marking endorsement in favour of department
            'other'                         -- Additional audit exhibits
        );
    END IF;
END $$;


-- ==============================================================================
-- 2. RENEWAL_CASES TABLE (Institutional Renewal Case File)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.renewal_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE RESTRICT,
    proposed_fdr_id UUID REFERENCES public.fdrs(id) ON DELETE RESTRICT,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
    case_status renewal_case_status_enum NOT NULL DEFAULT 'draft',
    renewal_reference VARCHAR(100),
    match_score NUMERIC(5, 2), -- 0.00 to 100.00 advisory score
    match_explanation JSONB DEFAULT '{}'::jsonb,
    submitted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    decision_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Invariant: Parent and proposed replacement cannot be identical
    CONSTRAINT chk_renewal_parent_not_same_as_proposed CHECK (
        proposed_fdr_id IS NULL OR parent_fdr_id != proposed_fdr_id
    )
);

CREATE INDEX IF NOT EXISTS idx_renewal_cases_parent ON public.renewal_cases(parent_fdr_id);
CREATE INDEX IF NOT EXISTS idx_renewal_cases_proposed ON public.renewal_cases(proposed_fdr_id);
CREATE INDEX IF NOT EXISTS idx_renewal_cases_institution ON public.renewal_cases(institution_id);
CREATE INDEX IF NOT EXISTS idx_renewal_cases_bank ON public.renewal_cases(bank_id);
CREATE INDEX IF NOT EXISTS idx_renewal_cases_status ON public.renewal_cases(case_status);
CREATE INDEX IF NOT EXISTS idx_renewal_cases_created ON public.renewal_cases(created_at DESC);


-- ==============================================================================
-- 3. FDR_LINEAGE TABLE (Immutable Directed Acyclic Lineage Graph)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fdr_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE RESTRICT,
    child_fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE RESTRICT,
    renewal_case_id UUID NOT NULL REFERENCES public.renewal_cases(id) ON DELETE RESTRICT,
    relationship_type lineage_relationship_type_enum NOT NULL DEFAULT 'renewal',
    approved_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evidence_reference JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Invariants:
    -- 1. Parent and child cannot be the same FDR
    CONSTRAINT chk_lineage_no_self_link CHECK (parent_fdr_id != child_fdr_id),
    -- 2. No duplicate edge between the same parent and child
    CONSTRAINT uq_lineage_parent_child UNIQUE (parent_fdr_id, child_fdr_id),
    -- 3. A child cannot have conflicting predecessor links (tree topology)
    CONSTRAINT uq_lineage_single_parent UNIQUE (child_fdr_id)
);

CREATE INDEX IF NOT EXISTS idx_fdr_lineage_parent ON public.fdr_lineage(parent_fdr_id);
CREATE INDEX IF NOT EXISTS idx_fdr_lineage_child ON public.fdr_lineage(child_fdr_id);
CREATE INDEX IF NOT EXISTS idx_fdr_lineage_case ON public.fdr_lineage(renewal_case_id);
CREATE INDEX IF NOT EXISTS idx_fdr_lineage_approved ON public.fdr_lineage(approved_at DESC);


-- ==============================================================================
-- 4. RENEWAL_EVIDENCE TABLE (Supporting Exhibits & Audit Documentation)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.renewal_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    renewal_case_id UUID NOT NULL REFERENCES public.renewal_cases(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
    evidence_type renewal_evidence_type_enum NOT NULL DEFAULT 'replacement_fdr_copy',
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renewal_evidence_case ON public.renewal_evidence(renewal_case_id);
CREATE INDEX IF NOT EXISTS idx_renewal_evidence_doc ON public.renewal_evidence(document_id);


-- ==============================================================================
-- 5. LINEAGE CYCLE DETECTION FUNCTION & TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_fdr_lineage_cycle()
RETURNS TRIGGER AS $$
DECLARE
    cycle_detected BOOLEAN := FALSE;
BEGIN
    -- Recursive check: verify that child_fdr_id does not already exist as an ancestor of parent_fdr_id
    WITH RECURSIVE ancestor_tree AS (
        SELECT parent_fdr_id AS node_id
        FROM public.fdr_lineage
        WHERE child_fdr_id = NEW.parent_fdr_id

        UNION ALL

        SELECT l.parent_fdr_id
        FROM public.fdr_lineage l
        INNER JOIN ancestor_tree a ON l.child_fdr_id = a.node_id
    )
    SELECT TRUE INTO cycle_detected
    FROM ancestor_tree
    WHERE node_id = NEW.child_fdr_id
    LIMIT 1;

    IF cycle_detected THEN
        RAISE EXCEPTION 'Lineage cycle detected: FDR % is already an ancestor of FDR %', NEW.child_fdr_id, NEW.parent_fdr_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_lineage_cycle ON public.fdr_lineage;
CREATE TRIGGER trg_prevent_lineage_cycle
    BEFORE INSERT OR UPDATE ON public.fdr_lineage
    FOR EACH ROW
    EXECUTE FUNCTION public.check_fdr_lineage_cycle();


-- ==============================================================================
-- 6. RECURSIVE LINEAGE RETRIEVAL HELPER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_fdr_lineage_chain(target_fdr_id UUID)
RETURNS TABLE (
    lineage_id UUID,
    parent_id UUID,
    child_id UUID,
    case_id UUID,
    rel_type lineage_relationship_type_enum,
    direction TEXT,
    depth INT
) AS $$
BEGIN
    RETURN QUERY
    -- Ancestors (looking up from target)
    WITH RECURSIVE ancestors AS (
        SELECT 
            l.id, l.parent_fdr_id, l.child_fdr_id, l.renewal_case_id, l.relationship_type,
            'ancestor'::TEXT AS dir,
            1 AS d
        FROM public.fdr_lineage l
        WHERE l.child_fdr_id = target_fdr_id

        UNION ALL

        SELECT 
            l2.id, l2.parent_fdr_id, l2.child_fdr_id, l2.renewal_case_id, l2.relationship_type,
            'ancestor'::TEXT,
            a.d + 1
        FROM public.fdr_lineage l2
        INNER JOIN ancestors a ON l2.child_fdr_id = a.parent_fdr_id
    ),
    -- Descendants (looking down from target)
    descendants AS (
        SELECT 
            l.id, l.parent_fdr_id, l.child_fdr_id, l.renewal_case_id, l.relationship_type,
            'descendant'::TEXT AS dir,
            1 AS d
        FROM public.fdr_lineage l
        WHERE l.parent_fdr_id = target_fdr_id

        UNION ALL

        SELECT 
            l3.id, l3.parent_fdr_id, l3.child_fdr_id, l3.renewal_case_id, l3.relationship_type,
            'descendant'::TEXT,
            desc.d + 1
        FROM public.fdr_lineage l3
        INNER JOIN descendants desc ON l3.parent_fdr_id = desc.child_fdr_id
    )
    SELECT * FROM ancestors
    UNION ALL
    SELECT * FROM descendants;
END;
$$ LANGUAGE plpgsql;
