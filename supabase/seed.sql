-- ==============================================================================
-- FDR-Chain: Complete Master Seed Data for Supabase
-- Preconfigured Institutions, Banks, Branches, Roles, FDRs, Policies & Telemetry
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- Seed Data: 03_seed_data.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 1: Master Seed Data & System Bootstrap
-- ==============================================================================

-- 1. SEED CANONICAL ROLES
INSERT INTO public.roles (name, display_name, description) VALUES
    ('system_admin', 'System Administrator', 'Full administrative authority over master records, users, and system configurations.'),
    ('bureau_officer', 'Central Bureau Officer', 'National oversight, cross-regional monitoring, compliance audits, and policy enforcement.'),
    ('finance_officer', 'Finance & Accounts Officer', 'Financial validation, treasury reconciliation, claims settlement and accounting.'),
    ('regional_officer', 'Regional Jurisdiction Officer', 'Territorial oversight over institutions and FDR deposits within assigned states/zones.'),
    ('bank_nodal_officer', 'Bank Nodal Branch Officer', 'Commercial bank representative responsible for e-verification, lien marking and custody confirmation.'),
    ('institution_user', 'Institutional Depositor Officer', 'Agency/Entity officer responsible for managing and tracking security deposit FDRs.')
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;


-- 2. SEED REGIONS (National Jurisdictions)
INSERT INTO public.regions (code, name, description, state_coverage, is_active) VALUES
    ('REG-NR', 'Northern Region', 'Jurisdiction covering North Indian states and UTs', ARRAY['Delhi', 'Punjab', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Uttarakhand', 'Chandigarh'], TRUE),
    ('REG-WR', 'Western Region', 'Jurisdiction covering Western industrial belt', ARRAY['Maharashtra', 'Gujarat', 'Goa', 'Daman & Diu', 'Dadra & Nagar Haveli'], TRUE),
    ('REG-SR', 'Southern Region', 'Jurisdiction covering South Indian territories', ARRAY['Karnataka', 'Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Kerala', 'Puducherry'], TRUE),
    ('REG-ER', 'Eastern Region', 'Jurisdiction covering East Indian coastal and mineral belts', ARRAY['West Bengal', 'Odisha', 'Bihar', 'Jharkhand', 'Andaman & Nicobar Islands'], TRUE),
    ('REG-CR', 'Central Region', 'Jurisdiction covering Central states', ARRAY['Madhya Pradesh', 'Chhattisgarh', 'Uttar Pradesh'], TRUE),
    ('REG-NER', 'North-Eastern Region', 'Jurisdiction covering North-Eastern states', ARRAY['Assam', 'Meghalaya', 'Tripura', 'Mizoram', 'Manipur', 'Nagaland', 'Arunachal Pradesh', 'Sikkim'], TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    state_coverage = EXCLUDED.state_coverage,
    is_active = EXCLUDED.is_active;


-- 3. SEED BANKS (Scheduled Commercial & Public Sector)
INSERT INTO public.banks (code, name, bank_type, headquarters, nodal_contact_name, contact_email, contact_phone, website, is_active) VALUES
    ('SBIN', 'State Bank of India', 'public_sector', 'Mumbai, Maharashtra', 'Chief General Manager (Institutional Banking)', 'nodal.fdr@sbi.co.in', '+91-22-22740000', 'https://sbi.co.in', TRUE),
    ('PUNB', 'Punjab National Bank', 'public_sector', 'New Delhi', 'General Manager (Government Business)', 'gov.fdr@pnb.co.in', '+91-11-28044000', 'https://pnbindia.in', TRUE),
    ('BARB', 'Bank of Baroda', 'public_sector', 'Vadodara, Gujarat', 'Head of Corporate Deposits', 'govtbusiness@bankofbaroda.com', '+91-22-66985000', 'https://bankofbaroda.in', TRUE),
    ('CNRB', 'Canara Bank', 'public_sector', 'Bengaluru, Karnataka', 'Deputy General Manager (Treasury)', 'treasury.fdr@canarabank.com', '+91-80-22221581', 'https://canarabank.com', TRUE),
    ('HDFC', 'HDFC Bank Limited', 'private_sector', 'Mumbai, Maharashtra', 'VP - Government & Institutional Business', 'govt.desk@hdfcbank.com', '+91-22-66521000', 'https://hdfcbank.com', TRUE),
    ('ICIC', 'ICICI Bank Limited', 'private_sector', 'Mumbai, Maharashtra', 'Zonal Head - Institutional Banking', 'institutional.fdr@icicibank.com', '+91-22-26531414', 'https://icicibank.com', TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    headquarters = EXCLUDED.headquarters,
    contact_email = EXCLUDED.contact_email;


-- 4. SEED BANK BRANCHES (with valid 11-char IFSC codes)
DO $$
DECLARE
    sbi_id UUID;
    pnb_id UUID;
    bob_id UUID;
    canara_id UUID;
    hdfc_id UUID;
    icici_id UUID;
    reg_nr_id UUID;
    reg_wr_id UUID;
    reg_sr_id UUID;
    reg_er_id UUID;
BEGIN
    SELECT id INTO sbi_id FROM public.banks WHERE code = 'SBIN';
    SELECT id INTO pnb_id FROM public.banks WHERE code = 'PUNB';
    SELECT id INTO bob_id FROM public.banks WHERE code = 'BARB';
    SELECT id INTO canara_id FROM public.banks WHERE code = 'CNRB';
    SELECT id INTO hdfc_id FROM public.banks WHERE code = 'HDFC';
    SELECT id INTO icici_id FROM public.banks WHERE code = 'ICIC';

    SELECT id INTO reg_nr_id FROM public.regions WHERE code = 'REG-NR';
    SELECT id INTO reg_wr_id FROM public.regions WHERE code = 'REG-WR';
    SELECT id INTO reg_sr_id FROM public.regions WHERE code = 'REG-SR';
    SELECT id INTO reg_er_id FROM public.regions WHERE code = 'REG-ER';

    -- SBI Branches
    INSERT INTO public.bank_branches (bank_id, branch_name, branch_code, ifsc_code, region_id, address, city, state, pincode, contact_email, contact_phone)
    VALUES
        (sbi_id, 'SBI New Delhi Main Branch', '00691', 'SBIN0000691', reg_nr_id, '11, Parliament Street', 'New Delhi', 'Delhi', '110001', 'sbi.00691@sbi.co.in', '+91-11-23374242'),
        (sbi_id, 'SBI Mumbai Main Branch', '00300', 'SBIN0000300', reg_wr_id, 'Mumbai Samachar Marg, Fort', 'Mumbai', 'Maharashtra', '400023', 'sbi.00300@sbi.co.in', '+91-22-22661555')
    ON CONFLICT (ifsc_code) DO NOTHING;

    -- PNB Branch
    INSERT INTO public.bank_branches (bank_id, branch_name, branch_code, ifsc_code, region_id, address, city, state, pincode, contact_email, contact_phone)
    VALUES
        (pnb_id, 'PNB Connaught Place Large Corporate Branch', '01400', 'PUNB0014000', reg_nr_id, 'ECE House, 28 KG Marg', 'New Delhi', 'Delhi', '110001', 'bo0140@pnb.co.in', '+91-11-23315678')
    ON CONFLICT (ifsc_code) DO NOTHING;

    -- Canara Branch
    INSERT INTO public.bank_branches (bank_id, branch_name, branch_code, ifsc_code, region_id, address, city, state, pincode, contact_email, contact_phone)
    VALUES
        (canara_id, 'Canara Bank Bangalore Town Hall', '00001', 'CNRB0000001', reg_sr_id, 'JC Road, Town Hall Circle', 'Bengaluru', 'Karnataka', '560002', 'cb0001@canarabank.com', '+91-80-22221234')
    ON CONFLICT (ifsc_code) DO NOTHING;

    -- HDFC Branch
    INSERT INTO public.bank_branches (bank_id, branch_name, branch_code, ifsc_code, region_id, address, city, state, pincode, contact_email, contact_phone)
    VALUES
        (hdfc_id, 'HDFC Bank Nariman Point Branch', '00060', 'HDFC0000060', reg_wr_id, 'Maneckji Wadia Bldg, Bell Lane, Fort', 'Mumbai', 'Maharashtra', '400001', 'branch0060@hdfcbank.com', '+91-22-61606161')
    ON CONFLICT (ifsc_code) DO NOTHING;

    -- ICICI Branch
    INSERT INTO public.bank_branches (bank_id, branch_name, branch_code, ifsc_code, region_id, address, city, state, pincode, contact_email, contact_phone)
    VALUES
        (icici_id, 'ICICI Bank Connaught Place', '00007', 'ICIC0000007', reg_nr_id, '9A, Phelps Building, Connaught Place', 'New Delhi', 'Delhi', '110001', 'cp.branch@icicibank.com', '+91-11-41511234')
    ON CONFLICT (ifsc_code) DO NOTHING;
END $$;


-- 5. SEED INSTITUTIONS (Government Entities & PSUs)
DO $$
DECLARE
    reg_nr_id UUID;
    reg_wr_id UUID;
    reg_sr_id UUID;
    reg_cr_id UUID;
BEGIN
    SELECT id INTO reg_nr_id FROM public.regions WHERE code = 'REG-NR';
    SELECT id INTO reg_wr_id FROM public.regions WHERE code = 'REG-WR';
    SELECT id INTO reg_sr_id FROM public.regions WHERE code = 'REG-SR';
    SELECT id INTO reg_cr_id FROM public.regions WHERE code = 'REG-CR';

    INSERT INTO public.institutions (code, name, institution_type, region_id, registration_number, nodal_ministry, address, city, state, pincode, contact_email, contact_phone, website)
    VALUES
        ('INST-NHAI', 'National Highways Authority of India', 'statutory_corporation', reg_nr_id, 'NHAI/ACT/1988/01', 'Ministry of Road Transport and Highways', 'G 5&6, Sector-10, Dwarka', 'New Delhi', 'Delhi', '110075', 'fdr.desk@nhai.gov.in', '+91-11-25074100', 'https://nhai.gov.in'),
        ('INST-CPWD', 'Central Public Works Department', 'government_department', reg_nr_id, 'GOI/MOHUA/CPWD/04', 'Ministry of Housing and Urban Affairs', 'Nirman Bhawan, Maulana Azad Road', 'New Delhi', 'Delhi', '110011', 'treasury@cpwd.gov.in', '+91-11-23062547', 'https://cpwd.gov.in'),
        ('INST-BHEL', 'Bharat Heavy Electricals Limited', 'central_psu', reg_nr_id, 'L74899DL1964GOI004281', 'Ministry of Heavy Industries', 'BHEL House, Siri Fort', 'New Delhi', 'Delhi', '110049', 'finance@bhel.in', '+91-11-66337000', 'https://bhel.com'),
        ('INST-MSEDCL', 'Maharashtra State Electricity Distribution Co. Ltd.', 'state_psu', reg_wr_id, 'U40109MH2005SGC153645', 'Department of Energy, Govt of Maharashtra', 'Prakashgad, Plot No. G-9, Bandra (E)', 'Mumbai', 'Maharashtra', '400051', 'tender.deposit@mahadiscom.in', '+91-22-26474211', 'https://mahadiscom.in'),
        ('INST-NTPC', 'NTPC Limited', 'central_psu', reg_cr_id, 'L40101DL1975GOI007966', 'Ministry of Power', 'NTPC Bhawan, SCOPE Complex, 7 Institutional Area, Lodhi Road', 'New Delhi', 'Delhi', '110003', 'sec.deposit@ntpc.co.in', '+91-11-24360100', 'https://ntpc.co.in'),
        ('INST-KTDC', 'Karnataka Tourism Development Corporation', 'state_psu', reg_sr_id, 'U85110KA1971SGC002021', 'Department of Tourism, Govt of Karnataka', 'Khanija Bhavan, 49, Race Course Road', 'Bengaluru', 'Karnataka', '560001', 'accounts@ktdc.gov.in', '+91-80-43344334', 'https://ktdc.gov.in')
    ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        contact_email = EXCLUDED.contact_email,
        nodal_ministry = EXCLUDED.nodal_ministry;
END $$;


-- ==============================================================================
-- BOOTSTRAP TRIGGER: AUTOMATIC PROFILE CREATION ON SUPABASE AUTH SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists, then attach to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- BOOTSTRAP PROCEDURE: FIRST SYSTEM ADMINISTRATOR ASSIGNMENT
-- Note: Replace '<YOUR_ADMIN_EMAIL>' with your actual administrator account email.
-- ==============================================================================
CREATE OR REPLACE PROCEDURE public.bootstrap_system_admin(admin_email TEXT)
AS $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.user_profiles WHERE email = admin_email;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User profile not found for email: %. Please register the user via Supabase Auth first.', admin_email;
    END IF;

    SELECT id INTO v_role_id FROM public.roles WHERE name = 'system_admin';

    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (v_user_id, v_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RAISE NOTICE 'User % has successfully been provisioned as system_admin.', admin_email;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------------------------
-- Seed Data: 06_phase2_seed_data.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
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


-- ------------------------------------------------------------------------------
-- Seed Data: 09_phase3_seed_data.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 3: Seed Bank Public Keys & Sample Attestations
-- ==============================================================================

DO $$
DECLARE
    bank_sbi UUID;
    bank_pnb UUID;
    bank_barb UUID;
    bank_cnrb UUID;
    bank_hdfc UUID;
    bank_icic UUID;
    admin_usr UUID;
    sample_fdr UUID;
    inst_nhai UUID;
    br_sbi_delhi UUID;
BEGIN
    SELECT id INTO bank_sbi FROM public.banks WHERE code = 'SBIN';
    SELECT id INTO bank_pnb FROM public.banks WHERE code = 'PUNB';
    SELECT id INTO bank_barb FROM public.banks WHERE code = 'BARB';
    SELECT id INTO bank_cnrb FROM public.banks WHERE code = 'CNRB';
    SELECT id INTO bank_hdfc FROM public.banks WHERE code = 'HDFC';
    SELECT id INTO bank_icic FROM public.banks WHERE code = 'ICIC';

    SELECT id INTO admin_usr FROM public.user_profiles LIMIT 1;
    SELECT id, institution_id, branch_id INTO sample_fdr, inst_nhai, br_sbi_delhi 
    FROM public.fdrs 
    WHERE fdr_number = 'FDR-2026-NHAI-84920' LIMIT 1;

    -- 1. SEED PUBLIC KEYS FOR AUTHORIZED SCHEDULED BANKS
    IF bank_sbi IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_sbi, 'SBIN-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEASuRbQCvDpMH1CD6WIt0goZcGYGvT/wHroISbkWCmAbc='||E'\n'||'-----END PUBLIC KEY-----',
            '4ae45b402bc3a4c1f5083e9622dd20a19706606bd3ff01eba0849b9160a601b7',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

    IF bank_pnb IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_pnb, 'PUNB-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEAgyNV+EKgUMsywcN3UxMPmt6gCZE/7RoID1KaOXfz+sg='||E'\n'||'-----END PUBLIC KEY-----',
            '832355f842a050cb32c1c37753130f9adea009913fed1a080f529a3977f3fac8',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

    IF bank_barb IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_barb, 'BARB-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEAB8U5aitgJgLTK60y3hGRJHhwBCltp302JBuFZVmay4w='||E'\n'||'-----END PUBLIC KEY-----',
            '07c5396a2b602602d32bad32de119124787004296da77d36241b8565599acb8c',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

    IF bank_cnrb IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_cnrb, 'CNRB-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEAfNXxmap0F3jOL0WRpVkEgA61xZwlVX0cLmlJ5do7drs='||E'\n'||'-----END PUBLIC KEY-----',
            '7cd5f199aa741778ce2f4591a55904800eb5c59c25557d1c2e6949e5da3b76bb',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

    IF bank_hdfc IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_hdfc, 'HDFC-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEAtCNF757eY7iDT7sJUFudkwKWaL0qCiWcfjNoTZ8Sm9M='||E'\n'||'-----END PUBLIC KEY-----',
            'b42345ef9ede63b8834fbb09505b9d93029668bd2a0a259c7e33684d9f129bd3',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

    IF bank_icic IS NOT NULL THEN
        INSERT INTO public.bank_keys (
            bank_id, key_id, algorithm, public_key_pem, public_key_raw_hex,
            valid_from, valid_until, is_active, is_revoked, created_by
        ) VALUES (
            bank_icic, 'ICIC-ED25519-2026-01', 'Ed25519',
            '-----BEGIN PUBLIC KEY-----'||E'\n'||'MCowBQYDK2VwAyEA/x0S0Gb6g4m/LYyOPpyZfdErpPC5WQVeRHln87c1Tis='||E'\n'||'-----END PUBLIC KEY-----',
            'ff1d12d066fa8389bf2d8c8e3e9c997dd12ba4f0b959055e447967f3b7354e2b',
            NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days', TRUE, FALSE, admin_usr
        ) ON CONFLICT (key_id) DO NOTHING;
    END IF;

END $$;


-- ------------------------------------------------------------------------------
-- Seed Data: 12_phase4_seed_data.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 4: Seed Policies, Heartbeat Checks & Regulatory Alerts
-- ==============================================================================

-- 1. SEED DEFAULT AND CRITICAL HEARTBEAT POLICIES
INSERT INTO public.heartbeat_policies (
    id,
    name,
    heartbeat_interval_days,
    stale_after_days,
    response_timeout_hours,
    max_retries,
    retry_interval_hours,
    maturity_alert_days,
    is_active,
    is_default
) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Standard Regulatory Cadence (30-Day Interval)',
    30,
    45,
    48,
    3,
    24,
    '{90,60,30,7,1,0}',
    TRUE,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000002',
    'High-Value Deposit Accelerated Cadence (14-Day Interval)',
    14,
    21,
    24,
    2,
    12,
    '{90,60,30,14,7,1,0}',
    TRUE,
    FALSE
)
ON CONFLICT (name) DO UPDATE SET
    heartbeat_interval_days = EXCLUDED.heartbeat_interval_days,
    stale_after_days = EXCLUDED.stale_after_days,
    response_timeout_hours = EXCLUDED.response_timeout_hours,
    max_retries = EXCLUDED.max_retries,
    retry_interval_hours = EXCLUDED.retry_interval_hours;


-- 2. INITIALIZE HEARTBEAT TIMESTAMPS AND STATUSES ON EXISTING SEED FDRS
UPDATE public.fdrs
SET 
    heartbeat_status = 'alive'::fdr_heartbeat_enum,
    last_heartbeat_at = NOW() - INTERVAL '5 days',
    next_heartbeat_at = NOW() + INTERVAL '25 days',
    heartbeat_failure_count = 0
WHERE fdr_number = 'FDR-2026-NHAI-84920';

UPDATE public.fdrs
SET 
    heartbeat_status = 'alive'::fdr_heartbeat_enum,
    last_heartbeat_at = NOW() - INTERVAL '12 days',
    next_heartbeat_at = NOW() + INTERVAL '18 days',
    heartbeat_failure_count = 0
WHERE fdr_number = 'FDR-2026-CPWD-10294';

UPDATE public.fdrs
SET 
    heartbeat_status = 'stale'::fdr_heartbeat_enum,
    last_heartbeat_at = NOW() - INTERVAL '48 days',
    next_heartbeat_at = NOW() - INTERVAL '18 days',
    heartbeat_failure_count = 1
WHERE fdr_number = 'FDR-2025-AICTE-55912';

UPDATE public.fdrs
SET 
    heartbeat_status = 'unresponsive'::fdr_heartbeat_enum,
    last_heartbeat_at = NOW() - INTERVAL '90 days',
    next_heartbeat_at = NOW() - INTERVAL '60 days',
    heartbeat_failure_count = 4
WHERE fdr_number = 'FDR-2025-DRDO-77291';


-- 3. SEED INITIAL SAMPLE FDR ALERTS
INSERT INTO public.fdr_alerts (
    id,
    fdr_id,
    institution_id,
    alert_type,
    severity,
    title,
    description,
    due_at,
    is_read,
    is_resolved
)
SELECT 
    '00000000-0000-0000-0000-000000000011'::uuid,
    f.id,
    f.institution_id,
    'heartbeat_stale',
    'high',
    'Heartbeat Overdue - Freshness Threshold Exceeded',
    'Deposit has not received verified bank re-attestation for over 45 days. Automatic verification request dispatched.',
    NOW() - INTERVAL '3 days',
    FALSE,
    FALSE
FROM public.fdrs f
WHERE f.fdr_number = 'FDR-2025-AICTE-55912'
ON CONFLICT DO NOTHING;

INSERT INTO public.fdr_alerts (
    id,
    fdr_id,
    institution_id,
    alert_type,
    severity,
    title,
    description,
    due_at,
    is_read,
    is_resolved
)
SELECT 
    '00000000-0000-0000-0000-000000000012'::uuid,
    f.id,
    f.institution_id,
    'heartbeat_unresponsive',
    'critical',
    'Bank Unresponsive - Exhausted Maximum Retry Limit',
    'Depository branch failed to acknowledge 3 consecutive heartbeat confirmation attempts. Escalate to Bank Nodal Officer.',
    NOW() - INTERVAL '10 days',
    FALSE,
    FALSE
FROM public.fdrs f
WHERE f.fdr_number = 'FDR-2025-DRDO-77291'
ON CONFLICT DO NOTHING;

INSERT INTO public.fdr_alerts (
    id,
    fdr_id,
    institution_id,
    alert_type,
    severity,
    title,
    description,
    due_at,
    is_read,
    is_resolved
)
SELECT 
    '00000000-0000-0000-0000-000000000013'::uuid,
    f.id,
    f.institution_id,
    'maturity_30_days',
    'medium',
    'Maturity Approaching Within 30 Days',
    'Deposit reaches statutory maturity within 30 days. Action required: initiate renewal verification or lien discharge audit.',
    f.maturity_date::timestamptz,
    FALSE,
    FALSE
FROM public.fdrs f
WHERE f.fdr_number = 'FDR-2026-CPWD-10294'
ON CONFLICT DO NOTHING;


-- ------------------------------------------------------------------------------
-- Seed Data: 15_phase5_seed_data.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
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


-- ------------------------------------------------------------------------------
-- Seed Data: 18_phase6_seed_data.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 6: Seed Data for Officer Workspace, Tasks, and Policies
-- ==============================================================================

-- 1. SEED DEFAULT QUEUE POLICY
INSERT INTO public.queue_policies (
    id,
    name,
    is_active,
    is_default,
    weights,
    thresholds,
    deadline_rules,
    escalation_rules
) VALUES (
    'd1000000-0000-0000-0000-000000000001',
    'Standard Regulatory Priority & Escalation Policy',
    TRUE,
    TRUE,
    '{
        "broken_fdr": 100,
        "unresponsive_heartbeat": 70,
        "stale_heartbeat": 40,
        "deadline_exceeded": 50,
        "deadline_within_24h": 35,
        "deadline_within_7d": 20,
        "renewal_awaiting_review": 20,
        "missing_evidence": 15,
        "escalated_case": 30
    }'::jsonb,
    '{
        "critical": 100,
        "high": 70,
        "medium": 35,
        "low": 0
    }'::jsonb,
    '{
        "broken_fdr_hours": 24,
        "unresponsive_hours": 48,
        "stale_heartbeat_days": 5,
        "renewal_review_days": 3,
        "standard_verification_days": 2
    }'::jsonb,
    '{
        "critical_immediate_notify": true,
        "overdue_escalation_hours": 24,
        "level_1_target_role": "regional_officer",
        "level_2_target_role": "bureau_officer"
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;


-- 2. SEED INITIAL OFFICER TASKS
INSERT INTO public.officer_tasks (
    id,
    task_type,
    source_type,
    source_id,
    fdr_number,
    title,
    description,
    priority_score,
    priority_level,
    priority_reasons,
    task_status,
    due_at,
    dedup_key
) VALUES 
(
    'e6000000-0000-0000-0000-000000000001',
    'broken_fdr_review',
    'fdr_alert',
    'a1000000-0000-0000-0000-000000000001',
    'FDR-2025-DRDO-77291',
    'Critical Lien Breach / Broken Standing Investigation',
    'State Bank of India reported statutory lien discharged on reserve deposit FDR-2025-DRDO-77291. Immediate regulatory inquiry required.',
    130,
    'critical',
    '[
        {"code": "broken_fdr", "points": 100, "description": "Deposit flagged as Broken / Lien Breach"},
        {"code": "escalated_case", "points": 30, "description": "Case escalated to Bureau Supervisor"}
    ]'::jsonb,
    'open',
    NOW() + INTERVAL '12 hours',
    'fdr_alert:a1000000-0000-0000-0000-000000000001:broken_fdr_review'
),
(
    'e6000000-0000-0000-0000-000000000002',
    'unresponsive_heartbeat_review',
    'heartbeat_check',
    'c1000000-0000-0000-0000-000000000002',
    'FDR-2026-CPWD-10294',
    'Depository Branch Unresponsive to Heartbeat Attestation',
    'Punjab National Bank branch failed to acknowledge or respond to 3 consecutive heartbeat confirmation attempts. Escalate to Bank Nodal Officer.',
    85,
    'high',
    '[
        {"code": "unresponsive_heartbeat", "points": 70, "description": "Bank failed all automated retries"},
        {"code": "missing_evidence", "points": 15, "description": "Freshness attestation missing"}
    ]'::jsonb,
    'in_progress',
    NOW() + INTERVAL '24 hours',
    'heartbeat_check:c1000000-0000-0000-0000-000000000002:unresponsive_heartbeat_review'
),
(
    'e6000000-0000-0000-0000-000000000003',
    'renewal_approval',
    'renewal_case',
    'e3000000-0000-0000-0000-000000000001',
    'FDR-2023-SBI-001',
    'Review Renewal Case REN-2026-0001 for SBI Rollover',
    'National Institute of Technology submitted replacement deposit FDR-2026-SBI-005. 6-signal matching score 85.00 (High). Awaiting officer review.',
    55,
    'medium',
    '[
        {"code": "renewal_awaiting_review", "points": 20, "description": "Renewal case submitted and pending decision"},
        {"code": "deadline_within_7d", "points": 20, "description": "Maturity transition deadline approaching"},
        {"code": "missing_evidence", "points": 15, "description": "Board resolution pending officer review"}
    ]'::jsonb,
    'open',
    NOW() + INTERVAL '48 hours',
    'renewal_case:e3000000-0000-0000-0000-000000000001:renewal_approval'
),
(
    'e6000000-0000-0000-0000-000000000004',
    'stale_heartbeat_review',
    'fdr_alert',
    'a1000000-0000-0000-0000-000000000003',
    'FDR-2025-AICTE-55912',
    'Stale Heartbeat Attestation - 45-Day Threshold Exceeded',
    'Deposit has not received verified bank re-attestation for over 45 days. Fresh check dispatch required.',
    40,
    'medium',
    '[
        {"code": "stale_heartbeat", "points": 40, "description": "Heartbeat attestation window expired"}
    ]'::jsonb,
    'open',
    NOW() + INTERVAL '3 days',
    'fdr_alert:a1000000-0000-0000-0000-000000000003:stale_heartbeat_review'
)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- Seed Data: 21_phase7_seed_data.sql
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
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


-- ------------------------------------------------------------------------------
-- Seed Data: 24_phase8_seed_data.sql
-- ------------------------------------------------------------------------------

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

