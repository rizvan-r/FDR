-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
-- Phase 7: Initial Seed Data for Compliance Templates & Migration Profiles
-- ==============================================================================

-- 1. INITIAL COMPLIANCE TEMPLATES
INSERT INTO public.compliance_templates (
    id,
    template_name,
    template_type,
    description,
    template_content,
    version,
    is_active
) VALUES
(
    '00000000-0000-0000-0007-000000000001',
    'FDR Details Confirmation Letter',
    'fdr_confirmation',
    'Official regulatory confirmation of security deposit fixed deposit details on AICTE record.',
    'REF: AICTE/FDR/CONF/{{fdr_number}}
Date: {{current_date}}

To,
The Registrar / Principal,
{{institution_name}}
{{institution_address}}

Subject: Formal Confirmation of Fixed Deposit Receipt Standing for {{institution_name}}

Sir / Madam,

This is to certify that Fixed Deposit Receipt (FDR) bearing Certificate No. {{fdr_number}}, in the principal sum of INR {{amount_in_words}} (₹{{amount}}), issued by {{bank_name}} ({{branch_name}}), with maturity date {{maturity_date}}, is duly registered in the Central AICTE FDR-Chain Repository.

Statutory Lien Standing:
The deposit remains validly pledged and encumbered in favour of {{lien_in_favour}} as regulatory security deposit pursuant to Approval Process Handbook provisions.

Authorized Signatory,
All India Council for Technical Education (AICTE)',
    1,
    TRUE
),
(
    '00000000-0000-0000-0007-000000000002',
    'Bank Verification Request Letter',
    'bank_verification_request',
    'Formal requisition to depository commercial bank branch for statutory lien verification.',
    'REF: AICTE/BANK/VERIFY/{{fdr_number}}
Date: {{current_date}}

To,
The Branch Manager,
{{bank_name}}, {{branch_name}}
IFSC: {{ifsc_code}}

Subject: Mandatory Digital & Ledger Verification of Pledged Security Deposit FDR {{fdr_number}}

Dear Branch Manager,

The institution {{institution_name}} has declared Fixed Deposit Receipt No. {{fdr_number}} in the amount of ₹{{amount}} pledged to {{lien_in_favour}}.

Pursuant to RBI Master Directions on Government Collateral Pledges, you are requested to verify the deposit standing on your branch CBS ledger and complete digital attestation on the FDR-Chain National Trust Network.

Kindly confirm that no premature encashment, loan, or third-party lien has been marked without explicit regulatory NOC.

Yours faithfully,
Regional Regulatory Officer, AICTE',
    1,
    TRUE
),
(
    '00000000-0000-0000-0007-000000000003',
    'FDR Renewal Reminder Letter',
    'renewal_reminder',
    'Advance regulatory reminder for approaching deposit maturity and rollover requirements.',
    'REF: AICTE/RENEWAL/REM/{{fdr_number}}
Date: {{current_date}}

To,
The Head of Institution,
{{institution_name}}

Subject: Urgent Notice: Approaching Maturity of Security Deposit FDR {{fdr_number}}

Sir / Madam,

Our surveillance monitoring system indicates that Fixed Deposit Receipt No. {{fdr_number}} for ₹{{amount}} is scheduled to mature on {{maturity_date}} (less than {{days_remaining}} days remaining).

You are required to initiate deposit renewal or replacement procedures immediately through the FDR-Chain Renewal Desk to prevent regulatory forfeiture or default notice under AICTE Regulations.

Please ensure the renewal deposit certificate retains the statutory lien in favour of {{lien_in_favour}}.

Bureau of Regulation, AICTE',
    1,
    TRUE
),
(
    '00000000-0000-0000-0007-000000000004',
    'Missing Document Notification',
    'missing_document_notice',
    'Notice issued when mandatory deposit certificate scan or bank acknowledgment is absent.',
    'REF: AICTE/DOC/DEFIC/{{fdr_number}}
Date: {{current_date}}

To,
{{institution_name}}

Subject: Regulatory Deficiency Notice: Missing Verification Documents for Deposit {{fdr_number}}

Sir / Madam,

Upon custodial inspection of security deposit record {{fdr_number}}, the following mandatory documents were found deficient or unverified:
- Original Banker Deposit Confirmation Letter
- Certificate Scanned Copy with SHA-256 integrity hash

You are directed to upload authenticated color scans of the deficient instruments via the institutional portal within 7 business days of receipt of this notice.

Compliance Division, AICTE',
    1,
    TRUE
),
(
    '00000000-0000-0000-0007-000000000005',
    'Compliance Clarification Letter',
    'compliance_clarification',
    'Formal inquiry regarding discrepancies or bank heartbeat alerts.',
    'REF: AICTE/COMP/CLAR/{{fdr_number}}
Date: {{current_date}}

To,
{{institution_name}}

Subject: Show Cause / Clarification Regarding Deposit Standing: FDR {{fdr_number}}

Sir / Madam,

Automated surveillance heartbeat pings to {{bank_name}} regarding deposit {{fdr_number}} reported an operational discrepancy: {{discrepancy_details}}.

You are hereby requested to submit a written explanation signed by the authorized management along with a fresh Bank Confirmation Certificate within 14 calendar days.

Failure to provide satisfactory clarification may result in immediate invocation of the security deposit lien.

Member Secretary / Legal Cell, AICTE',
    1,
    TRUE
),
(
    '00000000-0000-0000-0007-000000000006',
    'Institution-level FDR Summary Report',
    'institution_summary_report',
    'Comprehensive institutional audit summary of all active and matured deposit reserves.',
    'AICTE CUSTODIAL AUDIT SUMMARY REPORT
Generated On: {{current_date}}
Institution: {{institution_name}} (Code: {{institution_code}})
Jurisdiction: {{region_name}}

SUMMARY OF SECURITY DEPOSITS IN CUSTODY:
Total Registered FDRs: {{total_fdrs}}
Total Active Collateral: ₹{{total_amount}}
Trust Tier Distribution:
- Tier 3 (Cryptographically Signed): {{tier3_count}}
- Tier 2 (Bank Confirmed): {{tier2_count}}
- Tier 1 (Institution Declared): {{tier1_count}}

This report constitutes an authenticated system excerpt from the National FDR-Chain Repository.

National Directorate of Regulatory Approvals, AICTE',
    1,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 2. INITIAL MIGRATION MAPPING PROFILE
INSERT INTO public.migration_mapping_profiles (
    id,
    profile_name,
    column_mapping,
    created_at
) VALUES
(
    '00000000-0000-0000-0007-000000000010',
    'Standard AICTE Legacy Deposit Template',
    '{
        "Institution Name": "institution_name",
        "Bank Name": "bank_name",
        "Branch": "branch_name",
        "FDR No": "fdr_number",
        "Deposit Amount": "amount",
        "Currency": "currency",
        "Date of Issue": "issue_date",
        "Date of Maturity": "maturity_date",
        "Interest Rate": "interest_rate",
        "Lien In Favour": "lien_in_favour",
        "Remarks": "remarks"
    }'::jsonb,
    NOW()
)
ON CONFLICT (id) DO NOTHING;
