-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
-- Phase 5: Renewal Management, Matching Engine & FDR Lineage Seed Data
-- ==============================================================================

-- 1. SEED REPLACEMENT FDR (fdr-005)
-- Replacement deposit for FDR-2026-NHAI-84920 (fdr-001)
INSERT INTO public.fdrs (
    id,
    institution_id,
    bank_id,
    branch_id,
    fdr_number,
    amount,
    currency,
    issue_date,
    maturity_date,
    interest_rate,
    lien_in_favour,
    lifecycle_status,
    trust_tier,
    verification_status,
    heartbeat_status,
    remarks,
    created_at,
    updated_at
)
SELECT 
    'fdr-005'::UUID,
    f.institution_id,
    f.bank_id,
    f.branch_id,
    'FDR-2027-NHAI-99104',
    25000000.00,
    'INR',
    '2027-01-15'::DATE,
    '2028-01-15'::DATE,
    7.25,
    'Chairman, National Highways Authority of India',
    'active'::fdr_lifecycle_enum,
    2,
    'bank_confirmed'::fdr_verification_enum,
    'alive'::fdr_heartbeat_enum,
    'Official renewal replacement deposit for NH-48 Expressway Package 4',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
FROM public.fdrs f
WHERE f.id = 'fdr-001'::UUID
ON CONFLICT (id) DO NOTHING;

-- Update original fdr-001 status to 'renewed'
UPDATE public.fdrs 
SET lifecycle_status = 'renewed'::fdr_lifecycle_enum
WHERE id = 'fdr-001'::UUID;


-- 2. SEED APPROVED RENEWAL CASE & LINEAGE
INSERT INTO public.renewal_cases (
    id,
    parent_fdr_id,
    proposed_fdr_id,
    institution_id,
    bank_id,
    case_status,
    renewal_reference,
    match_score,
    match_explanation,
    submitted_by,
    submitted_at,
    reviewed_by,
    reviewed_at,
    decision_note,
    created_at,
    updated_at
)
SELECT
    'case-001'::UUID,
    'fdr-001'::UUID,
    'fdr-005'::UUID,
    f.institution_id,
    f.bank_id,
    'approved'::renewal_case_status_enum,
    'RNW-2027-NHAI-001',
    98.50,
    '{"institution_match": true, "bank_match": true, "amount_match": true, "date_validity": true, "reference_signal": true}'::jsonb,
    f.created_by,
    NOW() - INTERVAL '20 days',
    f.created_by,
    NOW() - INTERVAL '15 days',
    'Approved: Replacement FDR verified via Tier 2 bank confirmation. Lineage chain formally established.',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '15 days'
FROM public.fdrs f
WHERE f.id = 'fdr-001'::UUID
ON CONFLICT (id) DO NOTHING;

-- Establish lineage record
INSERT INTO public.fdr_lineage (
    id,
    parent_fdr_id,
    child_fdr_id,
    renewal_case_id,
    relationship_type,
    approved_by,
    approved_at,
    evidence_reference,
    created_at
)
SELECT
    'lineage-001'::UUID,
    'fdr-001'::UUID,
    'fdr-005'::UUID,
    'case-001'::UUID,
    'renewal'::lineage_relationship_type_enum,
    f.created_by,
    NOW() - INTERVAL '15 days',
    '{"approval_case": "case-001", "decision": "approved", "verifier": "Nodal Officer"}'::jsonb,
    NOW() - INTERVAL '15 days'
FROM public.fdrs f
WHERE f.id = 'fdr-001'::UUID
ON CONFLICT (id) DO NOTHING;


-- 3. SEED UNDER-REVIEW RENEWAL CASE (case-002 for fdr-002)
INSERT INTO public.renewal_cases (
    id,
    parent_fdr_id,
    proposed_fdr_id,
    institution_id,
    bank_id,
    case_status,
    renewal_reference,
    match_score,
    match_explanation,
    submitted_by,
    submitted_at,
    created_at,
    updated_at
)
SELECT
    'case-002'::UUID,
    'fdr-002'::UUID,
    NULL,
    f.institution_id,
    f.bank_id,
    'under_review'::renewal_case_status_enum,
    'RNW-2026-CPWD-881',
    82.00,
    '{"institution_match": true, "bank_match": true, "amount_match": true, "date_validity": true}'::jsonb,
    f.created_by,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '2 days'
FROM public.fdrs f
WHERE f.id = 'fdr-002'::UUID
ON CONFLICT (id) DO NOTHING;


-- 4. SEED DRAFT RENEWAL CASE (case-003 for fdr-003)
INSERT INTO public.renewal_cases (
    id,
    parent_fdr_id,
    proposed_fdr_id,
    institution_id,
    bank_id,
    case_status,
    renewal_reference,
    created_at,
    updated_at
)
SELECT
    'case-003'::UUID,
    'fdr-003'::UUID,
    NULL,
    f.institution_id,
    f.bank_id,
    'draft'::renewal_case_status_enum,
    'DRAFT-RNW-AICTE-01',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
FROM public.fdrs f
WHERE f.id = 'fdr-003'::UUID
ON CONFLICT (id) DO NOTHING;
