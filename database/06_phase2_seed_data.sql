-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
-- Phase 2: Seed Sample FDRs, Documents & Event History
-- ==============================================================================

DO $$
DECLARE
    inst_nhai UUID;
    inst_cpwd UUID;
    inst_bhel UUID;
    inst_msedcl UUID;
    bank_sbi UUID;
    bank_pnb UUID;
    bank_canara UUID;
    br_sbi_delhi UUID;
    br_pnb_cp UUID;
    br_canara_blr UUID;
    admin_usr UUID;
    fdr_1 UUID;
    fdr_2 UUID;
    fdr_3 UUID;
    fdr_4 UUID;
BEGIN
    SELECT id INTO inst_nhai FROM public.institutions WHERE code = 'INST-NHAI';
    SELECT id INTO inst_cpwd FROM public.institutions WHERE code = 'INST-CPWD';
    SELECT id INTO inst_bhel FROM public.institutions WHERE code = 'INST-BHEL';
    SELECT id INTO inst_msedcl FROM public.institutions WHERE code = 'INST-MSEDCL';

    SELECT id INTO bank_sbi FROM public.banks WHERE code = 'SBIN';
    SELECT id INTO bank_pnb FROM public.banks WHERE code = 'PUNB';
    SELECT id INTO bank_canara FROM public.banks WHERE code = 'CNRB';

    SELECT id INTO br_sbi_delhi FROM public.bank_branches WHERE ifsc_code = 'SBIN0000691';
    SELECT id INTO br_pnb_cp FROM public.bank_branches WHERE ifsc_code = 'PUNB0014000';
    SELECT id INTO br_canara_blr FROM public.bank_branches WHERE ifsc_code = 'CNRB0000001';

    SELECT id INTO admin_usr FROM public.user_profiles LIMIT 1;

    -- 1. Insert Sample FDR 1: NHAI (Pending, Tier 1 - Institution Declared)
    INSERT INTO public.fdrs (
        id, institution_id, bank_id, branch_id, fdr_number, amount, currency,
        issue_date, maturity_date, interest_rate, lien_in_favour,
        lifecycle_status, trust_tier, verification_status, heartbeat_status,
        remarks, created_by, created_at
    ) VALUES (
        gen_random_uuid(), inst_nhai, bank_sbi, br_sbi_delhi, 'FDR-2026-NHAI-84920',
        25000000.00, 'INR', '2026-01-15', '2027-01-15', 7.10,
        'Chairman, National Highways Authority of India',
        'pending', 1, 'institution_declared', 'not_started',
        'Performance Security Deposit for NH-48 Expressway Package 4',
        admin_usr, NOW() - INTERVAL '15 days'
    ) RETURNING id INTO fdr_1;

    -- Event for FDR 1
    INSERT INTO public.fdr_events (fdr_id, institution_id, actor_id, event_type, description, metadata, created_at)
    VALUES (
        fdr_1, inst_nhai, admin_usr, 'fdr_registered',
        'Institutional FDR record registered by depositor officer',
        '{"trust_tier": 1, "verification_status": "institution_declared", "amount": 25000000.00}'::jsonb,
        NOW() - INTERVAL '15 days'
    );

    -- Document for FDR 1
    INSERT INTO public.documents (
        fdr_id, institution_id, document_type, original_filename,
        storage_path, mime_type, file_size_bytes, sha256_checksum,
        description, uploaded_by, uploaded_at
    ) VALUES (
        fdr_1, inst_nhai, 'original_fdr', 'SBI_FDR_Receipt_84920.pdf',
        inst_nhai::text || '/' || fdr_1::text || '/doc-01/SBI_FDR_Receipt_84920.pdf',
        'application/pdf', 1428590, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'Official scanned bank FDR receipt with branch stamp',
        admin_usr, NOW() - INTERVAL '15 days'
    );

    -- 2. Insert Sample FDR 2: CPWD (Pending, Tier 1, upcoming maturity)
    INSERT INTO public.fdrs (
        id, institution_id, bank_id, branch_id, fdr_number, amount, currency,
        issue_date, maturity_date, interest_rate, lien_in_favour,
        lifecycle_status, trust_tier, verification_status, heartbeat_status,
        remarks, created_by, created_at
    ) VALUES (
        gen_random_uuid(), inst_cpwd, bank_pnb, br_pnb_cp, 'FDR-2025-CPWD-11029',
        8500000.00, 'INR', '2025-11-20', '2026-11-20', 6.85,
        'Executive Engineer, Central Public Works Department, Division III',
        'pending', 1, 'institution_declared', 'not_started',
        'Security deposit for Parliament Annex renovation civil works',
        admin_usr, NOW() - INTERVAL '20 days'
    ) RETURNING id INTO fdr_2;

    INSERT INTO public.fdr_events (fdr_id, institution_id, actor_id, event_type, description, metadata, created_at)
    VALUES (
        fdr_2, inst_cpwd, admin_usr, 'fdr_registered',
        'Institutional FDR record registered by depositor officer',
        '{"trust_tier": 1, "verification_status": "institution_declared", "amount": 8500000.00}'::jsonb,
        NOW() - INTERVAL '20 days'
    );

    INSERT INTO public.documents (
        fdr_id, institution_id, document_type, original_filename,
        storage_path, mime_type, file_size_bytes, sha256_checksum,
        description, uploaded_by, uploaded_at
    ) VALUES (
        fdr_2, inst_cpwd, 'original_fdr', 'PNB_CPWD_Deposit_11029.pdf',
        inst_cpwd::text || '/' || fdr_2::text || '/doc-02/PNB_CPWD_Deposit_11029.pdf',
        'application/pdf', 984210, 'f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2',
        'Original FDR deposit voucher',
        admin_usr, NOW() - INTERVAL '20 days'
    );

    -- 3. Insert Sample FDR 3: BHEL (Active, Tier 1)
    INSERT INTO public.fdrs (
        id, institution_id, bank_id, branch_id, fdr_number, amount, currency,
        issue_date, maturity_date, interest_rate, lien_in_favour,
        lifecycle_status, trust_tier, verification_status, heartbeat_status,
        remarks, created_by, created_at
    ) VALUES (
        gen_random_uuid(), inst_bhel, bank_canara, br_canara_blr, 'FDR-2026-BHEL-77301',
        50000000.00, 'INR', '2026-02-01', '2027-08-01', 7.25,
        'Director (Finance), Bharat Heavy Electricals Limited',
        'active', 1, 'institution_declared', 'not_started',
        'Turbine procurement guarantee deposit for NTPC Super Thermal Power Project',
        admin_usr, NOW() - INTERVAL '40 days'
    ) RETURNING id INTO fdr_3;

    INSERT INTO public.fdr_events (fdr_id, institution_id, actor_id, event_type, description, metadata, created_at)
    VALUES (
        fdr_3, inst_bhel, admin_usr, 'fdr_registered',
        'Institutional FDR record registered by depositor officer',
        '{"trust_tier": 1, "verification_status": "institution_declared", "amount": 50000000.00}'::jsonb,
        NOW() - INTERVAL '40 days'
    );

    -- 4. Insert Sample FDR 4: MSEDCL (Pending, Tier 1, maturing in 15 days)
    INSERT INTO public.fdrs (
        id, institution_id, bank_id, branch_id, fdr_number, amount, currency,
        issue_date, maturity_date, interest_rate, lien_in_favour,
        lifecycle_status, trust_tier, verification_status, heartbeat_status,
        remarks, created_by, created_at
    ) VALUES (
        gen_random_uuid(), inst_msedcl, bank_sbi, br_sbi_delhi, 'FDR-2025-MSEDCL-40291',
        12000000.00, 'INR', '2025-11-15', '2026-11-15', 7.00,
        'Chief Engineer (Stores), Maharashtra State Electricity Distribution Co.',
        'pending', 1, 'institution_declared', 'not_started',
        'Power transformer substation supply security deposit',
        admin_usr, NOW() - INTERVAL '60 days'
    ) RETURNING id INTO fdr_4;

    INSERT INTO public.fdr_events (fdr_id, institution_id, actor_id, event_type, description, metadata, created_at)
    VALUES (
        fdr_4, inst_msedcl, admin_usr, 'fdr_registered',
        'Institutional FDR record registered by depositor officer',
        '{"trust_tier": 1, "verification_status": "institution_declared", "amount": 12000000.00}'::jsonb,
        NOW() - INTERVAL '60 days'
    );

END $$;
