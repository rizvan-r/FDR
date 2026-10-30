-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
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
