-- ============================================================================
-- FDR-CHAIN ENTERPRISE PLATFORM: PHASE 8 SEED DATA
-- Default Statutory Release Policy & Initial Demonstration Records
-- ============================================================================

-- 1. SEED DEFAULT RELEASE POLICY VERSION
INSERT INTO release_policy_versions (
    id,
    policy_name,
    policy_version,
    policy_description,
    source_reference,
    effective_from,
    is_active,
    checklist_configuration,
    approval_configuration
) VALUES (
    '88888888-8888-8888-8888-888888880001'::uuid,
    'AICTE Standard Security Deposit Release Norms (2026-27)',
    'RPV-2026.1',
    'Standard statutory checklist and four-tier delegation matrix for institutional Fixed Deposit Receipt release, lien revocation, and refund reconciliation.',
    'AICTE Approval Process Handbook (APH) 2026-27, Chapter IV Section 4.3',
    '2026-01-01 00:00:00+00'::timestamptz,
    true,
    '[
        {
            "key": "CHK_FDR_IDENTITY",
            "title": "FDR Identity & Custody Verification",
            "description": "Verification of FDR receipt number, depository bank, branch IFSC, and original joint lien custody.",
            "is_required": true
        },
        {
            "key": "CHK_MATURITY_STATUS",
            "title": "Deposit Maturity & Tenure Completion",
            "description": "Validation that the mandatory statutory deposit tenure has elapsed without default or forfeiture proceedings.",
            "is_required": true
        },
        {
            "key": "CHK_BANK_VERIFICATION",
            "title": "Depository Bank Digital Standing",
            "description": "Confirmation that the deposit maintains verified status (Trust Tier >= 2) and healthy heartbeat surveillance.",
            "is_required": true
        },
        {
            "key": "CHK_COMPLIANCE_CLEARANCE",
            "title": "Institutional Regulatory Clearance",
            "description": "Verification that the institution has zero outstanding show-cause notices, legal stays, or regulatory penalties.",
            "is_required": true
        },
        {
            "key": "CHK_LINEAGE_INTEGRITY",
            "title": "Lineage & Non-Encumbrance Audit",
            "description": "Validation that the FDR is not linked as an active predecessor to an unresolved renewal case.",
            "is_required": true
        },
        {
            "key": "CHK_FINANCIAL_SETTLEMENT",
            "title": "Financial Corpus & Interest Assessment",
            "description": "Finance bureau assessment of principal sum, accrued maturity interest, and institutional refund bank account.",
            "is_required": true
        },
        {
            "key": "CHK_LEGAL_UNDERTAKING",
            "title": "Statutory Indemnity & Governing Body Undertaking",
            "description": "Submission of verified governing board resolution and non-dispute indemnity undertaking.",
            "is_required": false
        }
    ]'::jsonb,
    '{
        "stages": [
            { "stage": "preliminary_review", "role": "regional_officer", "label": "Regional Office Preliminary Review" },
            { "stage": "eligibility_review", "role": "bureau_officer", "label": "Approval Bureau Regulatory Audit" },
            { "stage": "finance_review", "role": "finance_officer", "label": "Finance Bureau Reconciliation" },
            { "stage": "authority_review", "role": "system_admin", "label": "Competent Authority Final Sanction" }
        ],
        "require_separation_of_duties": true,
        "allow_self_approval": false
    }'::jsonb
) ON CONFLICT (policy_version) DO UPDATE SET
    policy_name = EXCLUDED.policy_name,
    checklist_configuration = EXCLUDED.checklist_configuration,
    approval_configuration = EXCLUDED.approval_configuration;
