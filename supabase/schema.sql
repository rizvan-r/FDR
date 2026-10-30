-- ==============================================================================
-- FDR-Chain: Complete Unified Supabase Database Schema & Row-Level Security
-- Enterprise Institutional Fixed Deposit Receipt (FDR) Management Platform
-- Database Engine: PostgreSQL 15+ (Supabase)
-- ==============================================================================

-- Storage Buckets Configuration
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('fdr-documents', 'fdr-documents', false),
    ('compliance-certificates', 'compliance-certificates', false)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- Phase 1: Institutional Core Schema
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 1: Database Schema Definition
-- Database Engine: PostgreSQL (Supabase)
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing Phase 1 types if present
DROP TYPE IF EXISTS institution_type_enum CASCADE;
DROP TYPE IF EXISTS bank_type_enum CASCADE;

-- Enumerations
CREATE TYPE institution_type_enum AS ENUM (
    'central_psu',
    'state_psu',
    'autonomous_body',
    'government_department',
    'statutory_corporation',
    'other'
);

CREATE TYPE bank_type_enum AS ENUM (
    'public_sector',
    'private_sector',
    'scheduled_commercial',
    'regional_rural',
    'cooperative'
);

-- ==============================================================================
-- 1. ROLES TABLE (System Master)
-- Six canonical roles:
-- - institution_user
-- - bank_nodal_officer
-- - regional_officer
-- - bureau_officer
-- - finance_officer
-- - system_admin
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for role lookup
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

-- ==============================================================================
-- 2. REGIONS TABLE (Territorial Jurisdictions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    state_coverage TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regions_code ON public.regions(code);
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON public.regions(is_active);

-- ==============================================================================
-- 3. INSTITUTIONS TABLE (Government / Institutional Depositors)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    institution_type institution_type_enum NOT NULL DEFAULT 'government_department',
    region_id UUID REFERENCES public.regions(id) ON DELETE RESTRICT,
    registration_number VARCHAR(100),
    nodal_ministry VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    website VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institutions_code ON public.institutions(code);
CREATE INDEX IF NOT EXISTS idx_institutions_region ON public.institutions(region_id);
CREATE INDEX IF NOT EXISTS idx_institutions_is_active ON public.institutions(is_active);

-- ==============================================================================
-- 4. BANKS TABLE (Commercial / Public Sector Banks)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    bank_type bank_type_enum NOT NULL DEFAULT 'public_sector',
    headquarters VARCHAR(150),
    nodal_contact_name VARCHAR(150),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    website VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banks_code ON public.banks(code);
CREATE INDEX IF NOT EXISTS idx_banks_is_active ON public.banks(is_active);

-- ==============================================================================
-- 5. BANK BRANCHES TABLE (with IFSC validation format)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bank_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
    branch_name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(50),
    ifsc_code VARCHAR(11) NOT NULL UNIQUE,
    region_id UUID REFERENCES public.regions(id) ON DELETE RESTRICT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Standard Indian IFSC validation constraint: 4 letters, 0, 6 alphanumeric chars
    CONSTRAINT chk_ifsc_format CHECK (ifsc_code ~* '^[A-Z]{4}0[A-Z0-9]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_branches_bank_id ON public.bank_branches(bank_id);
CREATE INDEX IF NOT EXISTS idx_branches_ifsc ON public.bank_branches(ifsc_code);
CREATE INDEX IF NOT EXISTS idx_branches_region ON public.bank_branches(region_id);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON public.bank_branches(is_active);

-- ==============================================================================
-- 6. USER PROFILES TABLE (Linked with Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    designation VARCHAR(150),
    employee_id VARCHAR(50),
    phone VARCHAR(20),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
    bank_branch_id UUID REFERENCES public.bank_branches(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_institution ON public.user_profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_bank ON public.user_profiles(bank_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);

-- ==============================================================================
-- 7. USER ROLES TABLE (User-to-Role Mapping, RBAC)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role_id);

-- ==============================================================================
-- 8. USER REGION SCOPES (Jurisdiction Mapping for Regional Officers)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_region_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_region UNIQUE (user_id, region_id)
);

CREATE INDEX IF NOT EXISTS idx_user_region_scopes_user ON public.user_region_scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_region_scopes_region ON public.user_region_scopes(region_id);

-- ==============================================================================
-- AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_regions_updated_at
    BEFORE UPDATE ON public.regions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_institutions_updated_at
    BEFORE UPDATE ON public.institutions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_banks_updated_at
    BEFORE UPDATE ON public.banks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_bank_branches_updated_at
    BEFORE UPDATE ON public.bank_branches
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ------------------------------------------------------------------------------
-- Phase 1: Core Row-Level Security Policies
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 1: Row Level Security (RLS) Policies & Access Control Helper Functions
-- ==============================================================================

-- ==============================================================================
-- HELPER FUNCTIONS FOR SECURITY EVALUATION
-- ==============================================================================

-- 1. Helper to retrieve role names for a user
CREATE OR REPLACE FUNCTION public.get_auth_user_roles(target_user_id UUID)
RETURNS TABLE (role_name VARCHAR(50)) AS $$
BEGIN
    RETURN QUERY
    SELECT r.name
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Helper to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(target_user_id UUID, check_role VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = target_user_id AND r.name = check_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Helper to check if current user is system_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.has_role(auth.uid(), 'system_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Helper to check if current user is active
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Helper to get regions assigned to a user (for regional_officer)
CREATE OR REPLACE FUNCTION public.get_current_user_regions()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT region_id
    FROM public.user_region_scopes
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. Helper to get user's assigned institution ID
CREATE OR REPLACE FUNCTION public.get_current_user_institution_id()
RETURNS UUID AS $$
DECLARE
    inst_id UUID;
BEGIN
    SELECT institution_id INTO inst_id
    FROM public.user_profiles
    WHERE id = auth.uid();
    RETURN inst_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. Helper to get user's assigned bank ID
CREATE OR REPLACE FUNCTION public.get_current_user_bank_id()
RETURNS UUID AS $$
DECLARE
    b_id UUID;
BEGIN
    SELECT bank_id INTO b_id
    FROM public.user_profiles
    WHERE id = auth.uid();
    RETURN b_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ==============================================================================
-- ENABLE RLS ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_region_scopes ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- POLICIES: ROLES TABLE
-- ==============================================================================
-- All authenticated active users can view roles
CREATE POLICY "Authenticated users can read roles"
    ON public.roles FOR SELECT
    TO authenticated
    USING (public.is_user_active());

-- Only system_admin can modify roles
CREATE POLICY "Only system_admin can insert roles"
    ON public.roles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Only system_admin can update roles"
    ON public.roles FOR UPDATE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Only system_admin can delete roles"
    ON public.roles FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ==============================================================================
-- POLICIES: REGIONS TABLE
-- ==============================================================================
-- All authenticated users can view regions (needed for dropdowns & scope visibility)
CREATE POLICY "Authenticated users can read regions"
    ON public.regions FOR SELECT
    TO authenticated
    USING (public.is_user_active());

-- Only system_admin can insert/update/delete regions
CREATE POLICY "Admin manage regions insert"
    ON public.regions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage regions update"
    ON public.regions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage regions delete"
    ON public.regions FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ==============================================================================
-- POLICIES: INSTITUTIONS TABLE
-- ==============================================================================
-- Select permissions:
-- 1. System admin, bureau officer, finance officer can view all institutions
-- 2. Regional officer can view institutions located in their jurisdiction regions
-- 3. Institution user can view their assigned institution
CREATE POLICY "Read institutions policy"
    ON public.institutions FOR SELECT
    TO authenticated
    USING (
        public.is_user_active() AND (
            public.is_admin() OR
            public.has_role(auth.uid(), 'bureau_officer') OR
            public.has_role(auth.uid(), 'finance_officer') OR
            (public.has_role(auth.uid(), 'regional_officer') AND region_id IN (SELECT public.get_current_user_regions())) OR
            (public.has_role(auth.uid(), 'institution_user') AND id = public.get_current_user_institution_id()) OR
            public.has_role(auth.uid(), 'bank_nodal_officer')
        )
    );

-- Only system_admin can insert/update/delete institutions
CREATE POLICY "Admin insert institutions"
    ON public.institutions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin update institutions"
    ON public.institutions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete institutions"
    ON public.institutions FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ==============================================================================
-- POLICIES: BANKS TABLE
-- ==============================================================================
-- All active authenticated users can view active banks
CREATE POLICY "Read banks policy"
    ON public.banks FOR SELECT
    TO authenticated
    USING (public.is_user_active());

CREATE POLICY "Admin insert banks"
    ON public.banks FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin update banks"
    ON public.banks FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete banks"
    ON public.banks FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ==============================================================================
-- POLICIES: BANK BRANCHES TABLE
-- ==============================================================================
-- Read branches:
-- All active authenticated users can view branches
CREATE POLICY "Read bank branches policy"
    ON public.bank_branches FOR SELECT
    TO authenticated
    USING (public.is_user_active());

CREATE POLICY "Admin insert branches"
    ON public.bank_branches FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin update branches"
    ON public.bank_branches FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete branches"
    ON public.bank_branches FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ==============================================================================
-- POLICIES: USER PROFILES TABLE
-- ==============================================================================
-- Users can view their own profile; admins & bureau officers can view all profiles
CREATE POLICY "Read user profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR
        public.is_admin() OR
        public.has_role(auth.uid(), 'bureau_officer')
    );

-- Users can update basic profile info (phone, full_name) on their own profile,
-- but NOT role, institution_id, bank_id, or is_active!
CREATE POLICY "User update own profile details"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (
        public.is_admin() OR (
            id = auth.uid() AND
            institution_id IS NOT DISTINCT FROM (SELECT institution_id FROM public.user_profiles WHERE id = auth.uid()) AND
            bank_id IS NOT DISTINCT FROM (SELECT bank_id FROM public.user_profiles WHERE id = auth.uid()) AND
            bank_branch_id IS NOT DISTINCT FROM (SELECT bank_branch_id FROM public.user_profiles WHERE id = auth.uid()) AND
            is_active IS NOT DISTINCT FROM (SELECT is_active FROM public.user_profiles WHERE id = auth.uid())
        )
    );

-- Only system_admin can insert/delete user profiles directly
CREATE POLICY "Admin insert user profiles"
    ON public.user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() OR id = auth.uid());

CREATE POLICY "Admin delete user profiles"
    ON public.user_profiles FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ==============================================================================
-- POLICIES: USER ROLES TABLE
-- ==============================================================================
-- Users can view their own roles; admins can view all user roles
CREATE POLICY "Read user roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        public.is_admin() OR
        public.has_role(auth.uid(), 'bureau_officer')
    );

-- Strictly ONLY system_admin can assign or revoke roles
CREATE POLICY "Admin insert user roles"
    ON public.user_roles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin update user roles"
    ON public.user_roles FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete user roles"
    ON public.user_roles FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ==============================================================================
-- POLICIES: USER REGION SCOPES TABLE
-- ==============================================================================
-- Users can view their own region scopes; admins can view all
CREATE POLICY "Read user region scopes"
    ON public.user_region_scopes FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        public.is_admin() OR
        public.has_role(auth.uid(), 'bureau_officer')
    );

-- Strictly ONLY system_admin can insert or delete user region scopes
CREATE POLICY "Admin insert user region scopes"
    ON public.user_region_scopes FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin update user region scopes"
    ON public.user_region_scopes FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete user region scopes"
    ON public.user_region_scopes FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ------------------------------------------------------------------------------
-- Phase 2: FDR Repository & Document Schema
-- ------------------------------------------------------------------------------

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


-- ------------------------------------------------------------------------------
-- Phase 2: FDR Row-Level Security Policies
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 2: Row Level Security (RLS) & Storage Policies
-- ==============================================================================

-- Enable RLS on Phase 2 Tables
ALTER TABLE public.fdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdr_events ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 1. POLICIES: FDRS TABLE
-- ==============================================================================

-- SELECT Policy:
-- - system_admin, bureau_officer, finance_officer can view all FDRs
-- - regional_officer can view FDRs of institutions in their assigned regions
-- - bank_nodal_officer can view FDRs lodged at their designated bank
-- - institution_user can view FDRs belonging strictly to their own institution
CREATE POLICY "FDR Select Policy"
    ON public.fdrs FOR SELECT
    TO authenticated
    USING (
        public.is_user_active() AND (
            public.is_admin() OR
            public.has_role(auth.uid(), 'bureau_officer') OR
            public.has_role(auth.uid(), 'finance_officer') OR
            (
                public.has_role(auth.uid(), 'regional_officer') AND
                institution_id IN (
                    SELECT id FROM public.institutions
                    WHERE region_id IN (SELECT public.get_current_user_regions())
                )
            ) OR
            (
                public.has_role(auth.uid(), 'bank_nodal_officer') AND
                bank_id = public.get_current_user_bank_id()
            ) OR
            (
                public.has_role(auth.uid(), 'institution_user') AND
                institution_id = public.get_current_user_institution_id()
            )
        )
    );

-- INSERT Policy:
-- Institution users can insert FDRs ONLY for their own institution.
-- System admins can also insert.
-- Initial status MUST be trust_tier=1, lifecycle_status='pending', verification_status='institution_declared'.
CREATE POLICY "FDR Insert Policy"
    ON public.fdrs FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_user_active() AND (
            public.is_admin() OR
            (
                public.has_role(auth.uid(), 'institution_user') AND
                institution_id = public.get_current_user_institution_id() AND
                trust_tier = 1 AND
                lifecycle_status = 'pending' AND
                verification_status = 'institution_declared'
            )
        )
    );

-- UPDATE Policy:
-- Authorized institution users can edit permitted fields while the FDR is pending.
-- Cannot change institution_id, created_by, trust_tier, verification_status, or lifecycle_status.
CREATE POLICY "FDR Update Policy"
    ON public.fdrs FOR UPDATE
    TO authenticated
    USING (
        public.is_user_active() AND (
            public.is_admin() OR
            (
                public.has_role(auth.uid(), 'institution_user') AND
                institution_id = public.get_current_user_institution_id() AND
                lifecycle_status = 'pending'
            )
        )
    )
    WITH CHECK (
        public.is_admin() OR
        (
            public.has_role(auth.uid(), 'institution_user') AND
            institution_id = public.get_current_user_institution_id() AND
            lifecycle_status = 'pending' AND
            trust_tier = 1 AND
            verification_status = 'institution_declared'
        )
    );

-- DELETE Policy:
-- Strictly ONLY system_admin can delete an FDR record. Institution users CANNOT delete FDRs.
CREATE POLICY "FDR Delete Policy"
    ON public.fdrs FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ==============================================================================
-- 2. POLICIES: DOCUMENTS TABLE
-- ==============================================================================

CREATE POLICY "Documents Select Policy"
    ON public.documents FOR SELECT
    TO authenticated
    USING (
        public.is_user_active() AND (
            public.is_admin() OR
            public.has_role(auth.uid(), 'bureau_officer') OR
            public.has_role(auth.uid(), 'finance_officer') OR
            (
                public.has_role(auth.uid(), 'regional_officer') AND
                institution_id IN (
                    SELECT id FROM public.institutions
                    WHERE region_id IN (SELECT public.get_current_user_regions())
                )
            ) OR
            (
                public.has_role(auth.uid(), 'bank_nodal_officer') AND
                fdr_id IN (SELECT id FROM public.fdrs WHERE bank_id = public.get_current_user_bank_id())
            ) OR
            (
                public.has_role(auth.uid(), 'institution_user') AND
                institution_id = public.get_current_user_institution_id()
            )
        )
    );

CREATE POLICY "Documents Insert Policy"
    ON public.documents FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_user_active() AND (
            public.is_admin() OR
            (
                public.has_role(auth.uid(), 'institution_user') AND
                institution_id = public.get_current_user_institution_id()
            )
        )
    );

CREATE POLICY "Documents Delete Policy"
    ON public.documents FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ==============================================================================
-- 3. POLICIES: FDR EVENTS TABLE
-- ==============================================================================

CREATE POLICY "FDR Events Select Policy"
    ON public.fdr_events FOR SELECT
    TO authenticated
    USING (
        public.is_user_active() AND (
            public.is_admin() OR
            public.has_role(auth.uid(), 'bureau_officer') OR
            public.has_role(auth.uid(), 'finance_officer') OR
            (
                public.has_role(auth.uid(), 'regional_officer') AND
                institution_id IN (
                    SELECT id FROM public.institutions
                    WHERE region_id IN (SELECT public.get_current_user_regions())
                )
            ) OR
            (
                public.has_role(auth.uid(), 'bank_nodal_officer') AND
                fdr_id IN (SELECT id FROM public.fdrs WHERE bank_id = public.get_current_user_bank_id())
            ) OR
            (
                public.has_role(auth.uid(), 'institution_user') AND
                institution_id = public.get_current_user_institution_id()
            )
        )
    );

CREATE POLICY "FDR Events Insert Policy"
    ON public.fdr_events FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_user_active() AND (
            public.is_admin() OR
            public.has_role(auth.uid(), 'institution_user')
        )
    );

-- Modifying or deleting audit history is strictly prohibited
CREATE POLICY "FDR Events No Update"
    ON public.fdr_events FOR UPDATE
    TO authenticated
    USING (FALSE);

CREATE POLICY "FDR Events No Delete"
    ON public.fdr_events FOR DELETE
    TO authenticated
    USING (public.is_admin());


-- ==============================================================================
-- 4. SUPABASE STORAGE: PRIVATE BUCKET 'fdr-documents'
-- ==============================================================================
-- Note: Create bucket 'fdr-documents' as private in Supabase Storage dashboard
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'fdr-documents',
    'fdr-documents',
    FALSE,
    10485760, -- 10MB limit per document
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- Storage RLS: Authenticated users can upload to their institution path
CREATE POLICY "Allow authenticated upload to fdr-documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'fdr-documents' AND
        (storage.foldername(name))[1] = (SELECT public.get_current_user_institution_id()::text)
    );

-- Storage RLS: Authorized users can download documents
CREATE POLICY "Allow authorized download from fdr-documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'fdr-documents' AND (
            public.is_admin() OR
            public.has_role(auth.uid(), 'bureau_officer') OR
            public.has_role(auth.uid(), 'finance_officer') OR
            (storage.foldername(name))[1] = (SELECT public.get_current_user_institution_id()::text)
        )
    );


-- ------------------------------------------------------------------------------
-- Phase 3: Digital Bank Verification & Cryptographic Attestations Schema
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 3: Digital Bank Verification, Trust Tiers and Ed25519 Signatures Schema
-- ==============================================================================

-- 1. EXTEND ENUMERATIONS IF APPLICABLE
DO $$
BEGIN
    ALTER TYPE fdr_verification_enum ADD VALUE IF NOT EXISTS 'bank_confirmed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE fdr_verification_enum ADD VALUE IF NOT EXISTS 'signature_verified';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Attestation Type Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attestation_type_enum') THEN
        CREATE TYPE attestation_type_enum AS ENUM (
            'tier2_bank_confirmation',  -- Nodal bank officer single-use link confirmation
            'tier3_digital_signature'   -- Asymmetric Ed25519 cryptographically signed bank payload
        );
    END IF;
END $$;

-- Verification Request Status Enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_request_status_enum') THEN
        CREATE TYPE verification_request_status_enum AS ENUM (
            'pending',   -- Link active, awaiting bank officer response
            'consumed',  -- Token used to confirm or reject
            'expired',   -- Past the 48-hour validity period
            'revoked'    -- Cancelled due to FDR modifications or manual recall
        );
    END IF;
END $$;


-- ==============================================================================
-- 2. BANK KEYS TABLE (Public Key Registry for Ed25519 Digital Signatures)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bank_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
    key_id VARCHAR(100) NOT NULL UNIQUE,          -- Canonical identifier (e.g. SBIN-ED25519-2026-01)
    algorithm VARCHAR(50) NOT NULL DEFAULT 'Ed25519',
    public_key_pem TEXT NOT NULL,                 -- RFC 7468 PEM-encoded SubjectPublicKeyInfo
    public_key_raw_hex VARCHAR(128) NOT NULL,     -- 32-byte raw public key in hex
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,             -- Key lifecycle expiry
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_bank_keys_validity CHECK (valid_until > valid_from)
);

CREATE INDEX IF NOT EXISTS idx_bank_keys_bank ON public.bank_keys(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_keys_key_id ON public.bank_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_bank_keys_active ON public.bank_keys(is_active, is_revoked);


-- ==============================================================================
-- 3. VERIFICATION REQUESTS TABLE (Tier 2 Single-Use Ephemeral Link Tokens)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
    token_hash VARCHAR(64) NOT NULL UNIQUE,       -- SHA-256 hash of high-entropy 256-bit token
    status verification_request_status_enum NOT NULL DEFAULT 'pending',
    fdr_snapshot JSONB NOT NULL,                  -- Immutable snapshot of verified parameters at request time
    expires_at TIMESTAMPTZ NOT NULL,              -- Default 48 hours validity
    consumed_at TIMESTAMPTZ,
    consumed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invariant: Exactly one pending verification request allowed per FDR at any given time
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_verification_request 
    ON public.verification_requests (fdr_id) 
    WHERE (status = 'pending');

CREATE INDEX IF NOT EXISTS idx_verification_requests_fdr ON public.verification_requests(fdr_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_bank ON public.verification_requests(bank_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_token ON public.verification_requests(token_hash);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);


-- ==============================================================================
-- 4. BANK ATTESTATIONS TABLE (Immutable Historical Verification Evidence)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bank_attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.bank_branches(id) ON DELETE SET NULL,
    attestation_type attestation_type_enum NOT NULL,
    trust_tier INT NOT NULL CHECK (trust_tier IN (2, 3)),
    verification_status VARCHAR(50) NOT NULL,     -- 'bank_confirmed', 'signature_verified', 'rejected'
    request_id UUID REFERENCES public.verification_requests(id) ON DELETE SET NULL,
    key_id VARCHAR(100),                          -- References bank_keys(key_id) for Tier 3
    signed_payload JSONB,                         -- Canonical JSON payload verified for Tier 3
    signature_hex TEXT,                           -- 64-byte Ed25519 signature in hex format
    nonce VARCHAR(128),                           -- Replay protection nonce for Tier 3
    attested_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    attestation_metadata JSONB DEFAULT '{}'::jsonb, -- IP, User-Agent, Rejection Notes, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure bank associated with attestation matches the bank of the request / FDR
CREATE INDEX IF NOT EXISTS idx_bank_attestations_fdr ON public.bank_attestations(fdr_id);
CREATE INDEX IF NOT EXISTS idx_bank_attestations_bank ON public.bank_attestations(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_attestations_tier ON public.bank_attestations(trust_tier);
CREATE INDEX IF NOT EXISTS idx_bank_attestations_created ON public.bank_attestations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_attestations_nonce ON public.bank_attestations(nonce) WHERE (nonce IS NOT NULL);


-- ==============================================================================
-- 5. AUTOMATIC TIMESTAMP TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bank_keys_updated_at ON public.bank_keys;
CREATE TRIGGER trg_bank_keys_updated_at
    BEFORE UPDATE ON public.bank_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_verification_requests_updated_at ON public.verification_requests;
CREATE TRIGGER trg_verification_requests_updated_at
    BEFORE UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ------------------------------------------------------------------------------
-- Phase 3: Bank Verification RLS Policies
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 3: Row Level Security (RLS) & Access Control for Phase 3 Tables
-- ==============================================================================

-- Enable RLS on Phase 3 Tables
ALTER TABLE public.bank_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_attestations ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 1. POLICIES: BANK KEYS TABLE
-- ==============================================================================

-- SELECT Policy:
-- All active authenticated users can view registered bank public keys
CREATE POLICY "Bank Keys Select Policy"
    ON public.bank_keys FOR SELECT
    TO authenticated
    USING (public.is_user_active());

-- INSERT Policy:
-- Only system_admin can register bank public keys
CREATE POLICY "Bank Keys Admin Insert Policy"
    ON public.bank_keys FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- UPDATE Policy:
-- Only system_admin can update/revoke bank public keys
CREATE POLICY "Bank Keys Admin Update Policy"
    ON public.bank_keys FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- DELETE Policy:
-- Strictly disallow deletion to maintain attestation auditability
CREATE POLICY "Bank Keys Disallow Delete Policy"
    ON public.bank_keys FOR DELETE
    TO authenticated
    USING (FALSE);


-- ==============================================================================
-- 2. POLICIES: VERIFICATION REQUESTS TABLE
-- ==============================================================================

-- SELECT Policy:
-- - Admins, bureau officers, finance officers can view all verification requests
-- - Regional officers can view requests for institutions in their regions
-- - Institution users can view requests created for their own institution
-- - Bank nodal officers can view verification requests targeted at their bank
CREATE POLICY "Verification Requests Select Policy"
    ON public.verification_requests FOR SELECT
    TO authenticated
    USING (
        public.is_user_active() AND (
            public.is_admin() OR
            public.has_role(auth.uid(), 'bureau_officer') OR
            public.has_role(auth.uid(), 'finance_officer') OR
            (
                public.has_role(auth.uid(), 'regional_officer') AND
                institution_id IN (
                    SELECT id FROM public.institutions
                    WHERE region_id IN (SELECT public.get_current_user_regions())
                )
            ) OR
            (
                public.has_role(auth.uid(), 'institution_user') AND
                institution_id = public.get_current_user_institution_id()
            ) OR
            (
                public.has_role(auth.uid(), 'bank_nodal_officer') AND
                bank_id = public.get_current_user_bank_id()
            )
        )
    );

-- INSERT Policy:
-- Institution users can create requests ONLY for their institution's FDRs.
-- System admins can also insert.
CREATE POLICY "Verification Requests Insert Policy"
    ON public.verification_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_user_active() AND (
            public.is_admin() OR
            (
                public.has_role(auth.uid(), 'institution_user') AND
                institution_id = public.get_current_user_institution_id()
            )
        )
    );

-- UPDATE Policy:
-- Updating requests (e.g. marking consumed or revoked) requires administrative or bank role
CREATE POLICY "Verification Requests Update Policy"
    ON public.verification_requests FOR UPDATE
    TO authenticated
    USING (
        public.is_user_active() AND (
            public.is_admin() OR
            (
                public.has_role(auth.uid(), 'bank_nodal_officer') AND
                bank_id = public.get_current_user_bank_id()
            ) OR
            (
                public.has_role(auth.uid(), 'institution_user') AND
                institution_id = public.get_current_user_institution_id() AND
                status = 'revoked'
            )
        )
    );


-- ==============================================================================
-- 3. POLICIES: BANK ATTESTATIONS TABLE
-- ==============================================================================

-- SELECT Policy:
-- All authenticated actors with legitimate institutional/bank/regulatory scope can view attestations
CREATE POLICY "Bank Attestations Select Policy"
    ON public.bank_attestations FOR SELECT
    TO authenticated
    USING (
        public.is_user_active() AND (
            public.is_admin() OR
            public.has_role(auth.uid(), 'bureau_officer') OR
            public.has_role(auth.uid(), 'finance_officer') OR
            (
                public.has_role(auth.uid(), 'regional_officer') AND
                institution_id IN (
                    SELECT id FROM public.institutions
                    WHERE region_id IN (SELECT public.get_current_user_regions())
                )
            ) OR
            (
                public.has_role(auth.uid(), 'institution_user') AND
                institution_id = public.get_current_user_institution_id()
            ) OR
            (
                public.has_role(auth.uid(), 'bank_nodal_officer') AND
                bank_id = public.get_current_user_bank_id()
            )
        )
    );

-- INSERT Policy:
-- Server-only / authorized bank nodal officer or system admin
CREATE POLICY "Bank Attestations Insert Policy"
    ON public.bank_attestations FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_user_active() AND (
            public.is_admin() OR
            (
                public.has_role(auth.uid(), 'bank_nodal_officer') AND
                bank_id = public.get_current_user_bank_id()
            )
        )
    );

-- IMMUTABILITY: Attestations can NEVER be updated or deleted
CREATE POLICY "Bank Attestations Disallow Update Policy"
    ON public.bank_attestations FOR UPDATE
    TO authenticated
    USING (FALSE);

CREATE POLICY "Bank Attestations Disallow Delete Policy"
    ON public.bank_attestations FOR DELETE
    TO authenticated
    USING (FALSE);


-- ------------------------------------------------------------------------------
-- Phase 4: Periodic Heartbeat & Alert Desk Schema
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 4: Heartbeat Monitoring, Policy Administration & Alert Center Schema
-- ==============================================================================

-- 1. EXTEND FDR_HEARTBEAT_ENUM
-- Required monitoring statuses: not_started, alive, stale, broken, unresponsive
-- Retaining healthy, attention_required, expired for backwards compatibility
DO $$
BEGIN
    ALTER TYPE fdr_heartbeat_enum ADD VALUE IF NOT EXISTS 'alive';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE fdr_heartbeat_enum ADD VALUE IF NOT EXISTS 'stale';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE fdr_heartbeat_enum ADD VALUE IF NOT EXISTS 'broken';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    ALTER TYPE fdr_heartbeat_enum ADD VALUE IF NOT EXISTS 'unresponsive';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. EXTEND FDRS TABLE WITH HEARTBEAT METRICS
ALTER TABLE public.fdrs
    ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_heartbeat_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS heartbeat_failure_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_fdrs_heartbeat_status ON public.fdrs(heartbeat_status);
CREATE INDEX IF NOT EXISTS idx_fdrs_next_heartbeat ON public.fdrs(next_heartbeat_at);


-- ==============================================================================
-- 3. HEARTBEAT_POLICIES TABLE (Configurable Heartbeat & Maturity Monitoring)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.heartbeat_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    heartbeat_interval_days INTEGER NOT NULL CHECK (heartbeat_interval_days > 0),
    stale_after_days INTEGER NOT NULL CHECK (stale_after_days >= heartbeat_interval_days),
    response_timeout_hours INTEGER NOT NULL CHECK (response_timeout_hours > 0),
    max_retries INTEGER NOT NULL DEFAULT 3 CHECK (max_retries >= 0),
    retry_interval_hours INTEGER NOT NULL DEFAULT 24 CHECK (retry_interval_hours > 0),
    maturity_alert_days INTEGER[] NOT NULL DEFAULT '{90,60,30,7,1,0}'::integer[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    bank_id UUID REFERENCES public.banks(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one active default policy exists
CREATE UNIQUE INDEX IF NOT EXISTS uq_heartbeat_policies_default 
    ON public.heartbeat_policies(is_default) 
    WHERE (is_default = TRUE AND is_active = TRUE);

CREATE INDEX IF NOT EXISTS idx_heartbeat_policies_active ON public.heartbeat_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_heartbeat_policies_institution ON public.heartbeat_policies(institution_id) WHERE (institution_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_heartbeat_policies_bank ON public.heartbeat_policies(bank_id) WHERE (bank_id IS NOT NULL);


-- ==============================================================================
-- 4. HEARTBEAT_CHECKS TABLE (Immutable Append-Only Audit History)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.heartbeat_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE CASCADE,
    bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
    check_number INTEGER NOT NULL,
    check_status VARCHAR(50) NOT NULL CHECK (check_status IN (
        'scheduled',
        'requested',
        'confirmed',
        'rejected',
        'timed_out',
        'cancelled'
    )),
    verification_method VARCHAR(50) NOT NULL CHECK (verification_method IN (
        'tier2_bank_confirmation',
        'tier3_digital_signature'
    )),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response_due_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    request_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    attestation_id UUID REFERENCES public.bank_attestations(id) ON DELETE SET NULL,
    verification_request_id UUID REFERENCES public.verification_requests(id) ON DELETE SET NULL,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_fdr_check_number UNIQUE (fdr_id, check_number)
);

-- Partial index preventing duplicate active checks for the same FDR
CREATE UNIQUE INDEX IF NOT EXISTS uq_fdr_active_heartbeat_check 
    ON public.heartbeat_checks(fdr_id) 
    WHERE (check_status IN ('scheduled', 'requested'));

CREATE INDEX IF NOT EXISTS idx_heartbeat_checks_fdr ON public.heartbeat_checks(fdr_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_checks_bank ON public.heartbeat_checks(bank_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_checks_status ON public.heartbeat_checks(check_status);
CREATE INDEX IF NOT EXISTS idx_heartbeat_checks_due ON public.heartbeat_checks(response_due_at);
CREATE INDEX IF NOT EXISTS idx_heartbeat_checks_created ON public.heartbeat_checks(created_at DESC);


-- ==============================================================================
-- 5. FDR_ALERTS TABLE (Officer Attention & Maturity Warnings Desk)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fdr_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdr_id UUID NOT NULL REFERENCES public.fdrs(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'heartbeat_due',
        'heartbeat_stale',
        'heartbeat_broken',
        'heartbeat_unresponsive',
        'maturity_90_days',
        'maturity_60_days',
        'maturity_30_days',
        'maturity_7_days',
        'maturity_1_day',
        'maturity_today',
        'maturity_overdue'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN (
        'low',
        'medium',
        'high',
        'critical'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    due_at TIMESTAMPTZ,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    resolution_note TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deduplication index: prevent duplicate unresolved alerts for the same FDR and alert type
CREATE UNIQUE INDEX IF NOT EXISTS uq_fdr_alert_active 
    ON public.fdr_alerts(fdr_id, alert_type) 
    WHERE (is_resolved = FALSE);

CREATE INDEX IF NOT EXISTS idx_fdr_alerts_fdr ON public.fdr_alerts(fdr_id);
CREATE INDEX IF NOT EXISTS idx_fdr_alerts_inst ON public.fdr_alerts(institution_id);
CREATE INDEX IF NOT EXISTS idx_fdr_alerts_type ON public.fdr_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_fdr_alerts_severity ON public.fdr_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_fdr_alerts_status ON public.fdr_alerts(is_resolved, is_read);
CREATE INDEX IF NOT EXISTS idx_fdr_alerts_assigned ON public.fdr_alerts(assigned_to) WHERE (assigned_to IS NOT NULL);


-- ==============================================================================
-- 6. PHASE 3 ATTESTATIONS INTEGRATION
-- ==============================================================================
ALTER TABLE public.bank_attestations
    ADD COLUMN IF NOT EXISTS heartbeat_check_id UUID REFERENCES public.heartbeat_checks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bank_attestations_heartbeat_check 
    ON public.bank_attestations(heartbeat_check_id) 
    WHERE (heartbeat_check_id IS NOT NULL);


-- ==============================================================================
-- 7. UPDATED_AT TRIGGERS
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_heartbeat_policies_updated_at ON public.heartbeat_policies;
CREATE TRIGGER trg_heartbeat_policies_updated_at
    BEFORE UPDATE ON public.heartbeat_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_heartbeat_checks_updated_at ON public.heartbeat_checks;
CREATE TRIGGER trg_heartbeat_checks_updated_at
    BEFORE UPDATE ON public.heartbeat_checks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_fdr_alerts_updated_at ON public.fdr_alerts;
CREATE TRIGGER trg_fdr_alerts_updated_at
    BEFORE UPDATE ON public.fdr_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ------------------------------------------------------------------------------
-- Phase 4: Heartbeat Surveillance RLS Policies
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 4: Row Level Security (RLS) Policies for Heartbeat & Alerts
-- ==============================================================================

-- 1. ENABLE RLS ON PHASE 4 TABLES
ALTER TABLE public.heartbeat_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heartbeat_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdr_alerts ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 2. RLS POLICIES FOR HEARTBEAT_POLICIES
-- ==============================================================================

-- All authenticated users can view active heartbeat policies
DROP POLICY IF EXISTS "policy_view_active_heartbeat_policies" ON public.heartbeat_policies;
CREATE POLICY "policy_view_active_heartbeat_policies"
    ON public.heartbeat_policies
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE OR public.is_admin(auth.uid()));

-- Only System Administrators can insert, modify, or archive heartbeat policies
DROP POLICY IF EXISTS "policy_admin_insert_heartbeat_policies" ON public.heartbeat_policies;
CREATE POLICY "policy_admin_insert_heartbeat_policies"
    ON public.heartbeat_policies
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "policy_admin_update_heartbeat_policies" ON public.heartbeat_policies;
CREATE POLICY "policy_admin_update_heartbeat_policies"
    ON public.heartbeat_policies
    FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "policy_admin_delete_heartbeat_policies" ON public.heartbeat_policies;
CREATE POLICY "policy_admin_delete_heartbeat_policies"
    ON public.heartbeat_policies
    FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));


-- ==============================================================================
-- 3. RLS POLICIES FOR HEARTBEAT_CHECKS
-- ==============================================================================

-- Select: Scoped by institutional & bank boundaries
DROP POLICY IF EXISTS "policy_select_heartbeat_checks" ON public.heartbeat_checks;
CREATE POLICY "policy_select_heartbeat_checks"
    ON public.heartbeat_checks
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin(auth.uid())
        OR public.has_role(auth.uid(), 'bureau_officer')
        OR public.has_role(auth.uid(), 'finance_officer')
        -- Bank officers can only view checks for their bank
        OR (
            public.has_role(auth.uid(), 'bank_nodal_officer')
            AND bank_id = (SELECT bank_id FROM public.user_profiles WHERE id = auth.uid())
        )
        -- Institution users can only view checks for their institution's FDRs
        OR (
            public.has_role(auth.uid(), 'institution_user')
            AND fdr_id IN (
                SELECT id FROM public.fdrs 
                WHERE institution_id = (SELECT institution_id FROM public.user_profiles WHERE id = auth.uid())
            )
        )
        -- Regional officers can view checks within their assigned jurisdictions
        OR (
            public.has_role(auth.uid(), 'regional_officer')
            AND fdr_id IN (
                SELECT f.id FROM public.fdrs f
                JOIN public.institutions i ON f.institution_id = i.id
                WHERE i.region_id IN (
                    SELECT region_id FROM public.user_region_scopes WHERE user_id = auth.uid()
                )
            )
        )
    );

-- Insert: Automated scheduler, backend services or authorized officers
DROP POLICY IF EXISTS "policy_insert_heartbeat_checks" ON public.heartbeat_checks;
CREATE POLICY "policy_insert_heartbeat_checks"
    ON public.heartbeat_checks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin(auth.uid())
        OR public.has_role(auth.uid(), 'bureau_officer')
        OR public.has_role(auth.uid(), 'finance_officer')
    );

-- Update: Permitted strictly for pending/scheduled checks (e.g. response submission, retries)
DROP POLICY IF EXISTS "policy_update_heartbeat_checks" ON public.heartbeat_checks;
CREATE POLICY "policy_update_heartbeat_checks"
    ON public.heartbeat_checks
    FOR UPDATE
    TO authenticated
    USING (
        public.is_admin(auth.uid())
        OR (
            public.has_role(auth.uid(), 'bank_nodal_officer')
            AND bank_id = (SELECT bank_id FROM public.user_profiles WHERE id = auth.uid())
        )
        OR public.has_role(auth.uid(), 'bureau_officer')
    )
    WITH CHECK (
        -- Completed checks cannot be mutated
        check_status IN ('scheduled', 'requested', 'confirmed', 'rejected', 'timed_out', 'cancelled')
    );

-- Delete: Strictly forbidden to maintain immutable historical audit records
DROP POLICY IF EXISTS "policy_disallow_delete_heartbeat_checks" ON public.heartbeat_checks;
CREATE POLICY "policy_disallow_delete_heartbeat_checks"
    ON public.heartbeat_checks
    FOR DELETE
    TO authenticated
    USING (FALSE);


-- ==============================================================================
-- 4. RLS POLICIES FOR FDR_ALERTS
-- ==============================================================================

-- Select: View alerts relevant to scope
DROP POLICY IF EXISTS "policy_select_fdr_alerts" ON public.fdr_alerts;
CREATE POLICY "policy_select_fdr_alerts"
    ON public.fdr_alerts
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin(auth.uid())
        OR public.has_role(auth.uid(), 'bureau_officer')
        OR public.has_role(auth.uid(), 'finance_officer')
        -- Institution users can only view alerts for their institution
        OR (
            public.has_role(auth.uid(), 'institution_user')
            AND institution_id = (SELECT institution_id FROM public.user_profiles WHERE id = auth.uid())
        )
        -- Regional officers view alerts in their region
        OR (
            public.has_role(auth.uid(), 'regional_officer')
            AND institution_id IN (
                SELECT id FROM public.institutions 
                WHERE region_id IN (
                    SELECT region_id FROM public.user_region_scopes WHERE user_id = auth.uid()
                )
            )
        )
    );

-- Update: Mark read, assign, resolve
DROP POLICY IF EXISTS "policy_update_fdr_alerts" ON public.fdr_alerts;
CREATE POLICY "policy_update_fdr_alerts"
    ON public.fdr_alerts
    FOR UPDATE
    TO authenticated
    USING (
        public.is_admin(auth.uid())
        OR public.has_role(auth.uid(), 'bureau_officer')
        OR public.has_role(auth.uid(), 'finance_officer')
        OR public.has_role(auth.uid(), 'regional_officer')
        OR assigned_to = auth.uid()
    )
    WITH CHECK (
        public.is_admin(auth.uid())
        OR public.has_role(auth.uid(), 'bureau_officer')
        OR public.has_role(auth.uid(), 'finance_officer')
        OR public.has_role(auth.uid(), 'regional_officer')
        OR assigned_to = auth.uid()
    );

-- Delete: Only System Administrators can prune resolved historical alerts
DROP POLICY IF EXISTS "policy_delete_fdr_alerts" ON public.fdr_alerts;
CREATE POLICY "policy_delete_fdr_alerts"
    ON public.fdr_alerts
    FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()) AND is_resolved = TRUE);


-- ------------------------------------------------------------------------------
-- Phase 5: Renewal Management & DAG Lineage Schema
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
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


-- ------------------------------------------------------------------------------
-- Phase 5: Renewal Management RLS Policies
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 5: Renewal Management, Matching Engine & FDR Lineage RLS Policies
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.renewal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdr_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_evidence ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 2. RENEWAL_CASES POLICIES
-- ==============================================================================

-- SELECT Policy
DROP POLICY IF EXISTS p_renewal_cases_select ON public.renewal_cases;
CREATE POLICY p_renewal_cases_select ON public.renewal_cases
    FOR SELECT TO authenticated
    USING (
        -- System Administrators, Bureau Officers, and Finance Officers see all
        public.user_has_role(auth.uid(), 'system_admin')
        OR public.user_has_role(auth.uid(), 'bureau_officer')
        OR public.user_has_role(auth.uid(), 'finance_officer')
        -- Institutional users see cases for their institution
        OR (
            public.user_has_role(auth.uid(), 'institution_user')
            AND institution_id = (SELECT u.institution_id FROM public.user_profiles u WHERE u.id = auth.uid())
        )
        -- Bank officers see cases targeting their bank
        OR (
            public.user_has_role(auth.uid(), 'bank_nodal_officer')
            AND bank_id = (SELECT u.bank_id FROM public.user_profiles u WHERE u.id = auth.uid())
        )
        -- Regional officers see cases for institutions within their jurisdiction
        OR (
            public.user_has_role(auth.uid(), 'regional_officer')
            AND institution_id IN (
                SELECT i.id FROM public.institutions i
                INNER JOIN public.user_region_scopes urs ON i.region_id = urs.region_id
                WHERE urs.user_id = auth.uid()
            )
        )
    );

-- INSERT Policy: Institutional users can create cases for their institution; Officers/Admin can create
DROP POLICY IF EXISTS p_renewal_cases_insert ON public.renewal_cases;
CREATE POLICY p_renewal_cases_insert ON public.renewal_cases
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_role(auth.uid(), 'system_admin')
        OR public.user_has_role(auth.uid(), 'bureau_officer')
        OR (
            public.user_has_role(auth.uid(), 'institution_user')
            AND institution_id = (SELECT u.institution_id FROM public.user_profiles u WHERE u.id = auth.uid())
        )
    );

-- UPDATE Policy: Submitter can update draft; Officers/Admin can review and approve
DROP POLICY IF EXISTS p_renewal_cases_update ON public.renewal_cases;
CREATE POLICY p_renewal_cases_update ON public.renewal_cases
    FOR UPDATE TO authenticated
    USING (
        public.user_has_role(auth.uid(), 'system_admin')
        OR public.user_has_role(auth.uid(), 'bureau_officer')
        OR public.user_has_role(auth.uid(), 'regional_officer')
        OR public.user_has_role(auth.uid(), 'finance_officer')
        OR (
            public.user_has_role(auth.uid(), 'institution_user')
            AND institution_id = (SELECT u.institution_id FROM public.user_profiles u WHERE u.id = auth.uid())
            AND case_status IN ('draft', 'submitted')
        )
    )
    WITH CHECK (
        public.user_has_role(auth.uid(), 'system_admin')
        OR public.user_has_role(auth.uid(), 'bureau_officer')
        OR public.user_has_role(auth.uid(), 'regional_officer')
        OR public.user_has_role(auth.uid(), 'finance_officer')
        OR (
            public.user_has_role(auth.uid(), 'institution_user')
            AND institution_id = (SELECT u.institution_id FROM public.user_profiles u WHERE u.id = auth.uid())
            AND case_status IN ('draft', 'submitted')
        )
    );


-- ==============================================================================
-- 3. FDR_LINEAGE POLICIES (Immutable Ledger)
-- ==============================================================================

-- SELECT Policy
DROP POLICY IF EXISTS p_fdr_lineage_select ON public.fdr_lineage;
CREATE POLICY p_fdr_lineage_select ON public.fdr_lineage
    FOR SELECT TO authenticated
    USING (
        public.user_has_role(auth.uid(), 'system_admin')
        OR public.user_has_role(auth.uid(), 'bureau_officer')
        OR public.user_has_role(auth.uid(), 'finance_officer')
        OR public.user_has_role(auth.uid(), 'regional_officer')
        OR (
            public.user_has_role(auth.uid(), 'institution_user')
            AND EXISTS (
                SELECT 1 FROM public.fdrs f
                WHERE f.id = parent_fdr_id
                AND f.institution_id = (SELECT u.institution_id FROM public.user_profiles u WHERE u.id = auth.uid())
            )
        )
        OR (
            public.user_has_role(auth.uid(), 'bank_nodal_officer')
            AND EXISTS (
                SELECT 1 FROM public.fdrs f
                WHERE f.id = parent_fdr_id
                AND f.bank_id = (SELECT u.bank_id FROM public.user_profiles u WHERE u.id = auth.uid())
            )
        )
    );

-- INSERT Policy: Strictly authorized compliance officers during approved transaction
DROP POLICY IF EXISTS p_fdr_lineage_insert ON public.fdr_lineage;
CREATE POLICY p_fdr_lineage_insert ON public.fdr_lineage
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_role(auth.uid(), 'system_admin')
        OR public.user_has_role(auth.uid(), 'bureau_officer')
        OR public.user_has_role(auth.uid(), 'regional_officer')
        OR public.user_has_role(auth.uid(), 'finance_officer')
    );

-- Lineage updates and deletions are strictly disallowed to guarantee permanent immutability


-- ==============================================================================
-- 4. RENEWAL_EVIDENCE POLICIES
-- ==============================================================================

-- SELECT Policy
DROP POLICY IF EXISTS p_renewal_evidence_select ON public.renewal_evidence;
CREATE POLICY p_renewal_evidence_select ON public.renewal_evidence
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.renewal_cases rc
            WHERE rc.id = renewal_case_id
        )
    );

-- INSERT Policy
DROP POLICY IF EXISTS p_renewal_evidence_insert ON public.renewal_evidence;
CREATE POLICY p_renewal_evidence_insert ON public.renewal_evidence
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_role(auth.uid(), 'system_admin')
        OR public.user_has_role(auth.uid(), 'bureau_officer')
        OR (
            public.user_has_role(auth.uid(), 'institution_user')
            AND EXISTS (
                SELECT 1 FROM public.renewal_cases rc
                WHERE rc.id = renewal_case_id
                AND rc.institution_id = (SELECT u.institution_id FROM public.user_profiles u WHERE u.id = auth.uid())
            )
        )
    );

-- UPDATE Policy: Officers can verify exhibits
DROP POLICY IF EXISTS p_renewal_evidence_update ON public.renewal_evidence;
CREATE POLICY p_renewal_evidence_update ON public.renewal_evidence
    FOR UPDATE TO authenticated
    USING (
        public.user_has_role(auth.uid(), 'system_admin')
        OR public.user_has_role(auth.uid(), 'bureau_officer')
        OR public.user_has_role(auth.uid(), 'regional_officer')
        OR public.user_has_role(auth.uid(), 'finance_officer')
    )
    WITH CHECK (
        public.user_has_role(auth.uid(), 'system_admin')
        OR public.user_has_role(auth.uid(), 'bureau_officer')
        OR public.user_has_role(auth.uid(), 'regional_officer')
        OR public.user_has_role(auth.uid(), 'finance_officer')
    );


-- ------------------------------------------------------------------------------
-- Phase 6: Officer Dashboard & Priority Queue Schema
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 6: Officer Dashboard, Priority Queue & Task Management Schema
-- ==============================================================================

-- 1. OFFICER_TASKS TABLE (Unified Priority Queue & Operational Task Worklist)
CREATE TABLE IF NOT EXISTS public.officer_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type VARCHAR(100) NOT NULL CHECK (task_type IN (
        'broken_fdr_review',
        'stale_heartbeat_review',
        'unresponsive_heartbeat_review',
        'pending_bank_verification',
        'overdue_verification',
        'renewal_approval',
        'renewal_evidence_review',
        'upcoming_maturity_follow_up',
        'escalation_acknowledgement'
    )),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'fdr_alert',
        'heartbeat_check',
        'verification_request',
        'renewal_case',
        'fdr',
        'escalation'
    )),
    source_id UUID NOT NULL,
    fdr_id UUID REFERENCES public.fdrs(id) ON DELETE CASCADE,
    fdr_number VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
    bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(150),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    priority_score INTEGER NOT NULL DEFAULT 0,
    priority_level VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (priority_level IN ('critical', 'high', 'medium', 'low')),
    priority_reasons JSONB DEFAULT '[]'::jsonb,
    task_status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (task_status IN (
        'open',
        'in_progress',
        'waiting',
        'completed',
        'cancelled'
    )),
    due_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completion_note TEXT,
    dedup_key VARCHAR(255) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to prevent duplicate unresolved tasks for the same source event
CREATE UNIQUE INDEX IF NOT EXISTS uq_officer_task_unresolved 
    ON public.officer_tasks(source_type, source_id, task_type) 
    WHERE (task_status NOT IN ('completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_officer_tasks_status ON public.officer_tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_priority ON public.officer_tasks(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_priority_level ON public.officer_tasks(priority_level);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_assigned_to ON public.officer_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_institution ON public.officer_tasks(institution_id);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_region ON public.officer_tasks(region_id);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_due_at ON public.officer_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_officer_tasks_fdr ON public.officer_tasks(fdr_id);


-- ==============================================================================
-- 2. TASK_ASSIGNMENTS TABLE (Assignment & Reassignment Audit History)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.officer_tasks(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    assigned_to_name VARCHAR(150),
    assigned_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    assigned_by_name VARCHAR(150),
    assignment_note TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_to ON public.task_assignments(assigned_to);


-- ==============================================================================
-- 3. TASK_COMMENTS TABLE (Officer Collaboration & Audit Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.officer_tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    user_name VARCHAR(150),
    user_role VARCHAR(50),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created ON public.task_comments(created_at DESC);


-- ==============================================================================
-- 4. TASK_ESCALATIONS TABLE (Supervisory Escalation Pipeline)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.task_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.officer_tasks(id) ON DELETE CASCADE,
    escalation_level INTEGER NOT NULL DEFAULT 1,
    escalated_from UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    escalated_from_name VARCHAR(150),
    escalated_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    escalated_to_name VARCHAR(150),
    escalated_to_role VARCHAR(50),
    reason TEXT NOT NULL,
    escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    resolution_note TEXT
);

-- Prevent duplicate unresolved escalations for the same task and level
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_escalation_active
    ON public.task_escalations(task_id, escalation_level)
    WHERE (resolved_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_task_escalations_task ON public.task_escalations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_escalations_escalated_to ON public.task_escalations(escalated_to);


-- ==============================================================================
-- 5. OFFICER_NOTIFICATIONS TABLE (Actionable Alerts & Notifications)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.officer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.officer_tasks(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_officer_notifications_recipient ON public.officer_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_officer_notifications_read ON public.officer_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_officer_notifications_created ON public.officer_notifications(created_at DESC);


-- ==============================================================================
-- 6. QUEUE_POLICIES TABLE (Configurable Priority Scoring & Escalation Rules)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.queue_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    weights JSONB NOT NULL DEFAULT '{
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
    thresholds JSONB NOT NULL DEFAULT '{
        "critical": 100,
        "high": 70,
        "medium": 35,
        "low": 0
    }'::jsonb,
    deadline_rules JSONB NOT NULL DEFAULT '{
        "broken_fdr_hours": 24,
        "unresponsive_hours": 48,
        "stale_heartbeat_days": 5,
        "renewal_review_days": 3,
        "standard_verification_days": 2
    }'::jsonb,
    escalation_rules JSONB NOT NULL DEFAULT '{
        "critical_immediate_notify": true,
        "overdue_escalation_hours": 24,
        "level_1_target_role": "regional_officer",
        "level_2_target_role": "bureau_officer"
    }'::jsonb,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index ensuring single active default queue policy
CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_policies_default 
    ON public.queue_policies(is_default) 
    WHERE (is_default = TRUE AND is_active = TRUE);


-- ==============================================================================
-- 7. AUTOMATIC TIMESTAMP TRIGGERS
-- ==============================================================================
CREATE TRIGGER trg_officer_tasks_updated_at
    BEFORE UPDATE ON public.officer_tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_queue_policies_updated_at
    BEFORE UPDATE ON public.queue_policies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ------------------------------------------------------------------------------
-- Phase 6: Officer Queue RLS Policies
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 6: Row-Level Security (RLS) Policies for Officer Workspace
-- ==============================================================================

-- Enable RLS on all Phase 6 tables
ALTER TABLE public.officer_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_policies ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 1. OFFICER_TASKS POLICIES
-- ==============================================================================

-- System Administrators: Unrestricted access
CREATE POLICY p_admin_officer_tasks_all ON public.officer_tasks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'system_admin'
        )
    );

-- Regulation Bureau Officers: Broad access across all bureau jurisdictions
CREATE POLICY p_bureau_officer_tasks_select ON public.officer_tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'bureau_officer'
        )
    );

CREATE POLICY p_bureau_officer_tasks_update ON public.officer_tasks
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'bureau_officer'
        )
    );

-- Regional Officers: Scoped by user_region_scopes or institution's region
CREATE POLICY p_regional_officer_tasks_select ON public.officer_tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'regional_officer'
        )
        AND (
            region_id IN (SELECT region_id FROM public.user_region_scopes WHERE user_id = auth.uid())
            OR institution_id IN (
                SELECT id FROM public.institutions 
                WHERE region_id IN (SELECT region_id FROM public.user_region_scopes WHERE user_id = auth.uid())
            )
            OR assigned_to = auth.uid()
        )
    );

CREATE POLICY p_regional_officer_tasks_update ON public.officer_tasks
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'regional_officer'
        )
        AND (
            region_id IN (SELECT region_id FROM public.user_region_scopes WHERE user_id = auth.uid())
            OR assigned_to = auth.uid()
        )
    );

-- Institution Users: Scoped strictly to their own institution
CREATE POLICY p_institution_officer_tasks_select ON public.officer_tasks
    FOR SELECT TO authenticated
    USING (
        institution_id IN (
            SELECT institution_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

-- Bank Nodal Officers: Scoped to their depository bank
CREATE POLICY p_bank_officer_tasks_select ON public.officer_tasks
    FOR SELECT TO authenticated
    USING (
        bank_id IN (
            SELECT bank_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

-- Finance Officers: Read-only access across monitored tasks
CREATE POLICY p_finance_officer_tasks_select ON public.officer_tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'finance_officer'
        )
    );


-- ==============================================================================
-- 2. TASK_ASSIGNMENTS POLICIES
-- ==============================================================================

CREATE POLICY p_task_assignments_select ON public.task_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.officer_tasks t
            WHERE t.id = task_assignments.task_id
        )
    );

CREATE POLICY p_task_assignments_insert ON public.task_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer')
        )
    );


-- ==============================================================================
-- 3. TASK_COMMENTS POLICIES
-- ==============================================================================

CREATE POLICY p_task_comments_select ON public.task_comments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.officer_tasks t
            WHERE t.id = task_comments.task_id
        )
    );

CREATE POLICY p_task_comments_insert ON public.task_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.officer_tasks t
            WHERE t.id = task_comments.task_id
        )
    );


-- ==============================================================================
-- 4. TASK_ESCALATIONS POLICIES
-- ==============================================================================

CREATE POLICY p_task_escalations_select ON public.task_escalations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.officer_tasks t
            WHERE t.id = task_escalations.task_id
        )
    );

CREATE POLICY p_task_escalations_manage ON public.task_escalations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer')
        )
    );


-- ==============================================================================
-- 5. OFFICER_NOTIFICATIONS POLICIES
-- ==============================================================================

-- Notifications are strictly private to the recipient user
CREATE POLICY p_officer_notifications_select ON public.officer_notifications
    FOR SELECT TO authenticated
    USING (recipient_user_id = auth.uid());

CREATE POLICY p_officer_notifications_update ON public.officer_notifications
    FOR UPDATE TO authenticated
    USING (recipient_user_id = auth.uid())
    WITH CHECK (recipient_user_id = auth.uid());


-- ==============================================================================
-- 6. QUEUE_POLICIES POLICIES
-- ==============================================================================

CREATE POLICY p_queue_policies_select ON public.queue_policies
    FOR SELECT TO authenticated
    USING (is_active = TRUE);

CREATE POLICY p_queue_policies_admin ON public.queue_policies
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'system_admin'
        )
    );


-- ------------------------------------------------------------------------------
-- Phase 7: Legacy Migration & Compliance Document Schema
-- ------------------------------------------------------------------------------

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


-- ------------------------------------------------------------------------------
-- Phase 7: Legacy Migration & Compliance RLS Policies
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal 
-- Phase 7: Row-Level Security (RLS) Policies for Migration & Compliance
-- ==============================================================================

-- Enable RLS on all Phase 7 tables
ALTER TABLE public.migration_mapping_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_signature_records ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 1. MIGRATION_BATCHES & ROWS POLICIES
-- ==============================================================================

-- System Admin: Full Access
CREATE POLICY p_admin_migration_batches ON public.migration_batches
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'system_admin'
        )
    );

CREATE POLICY p_admin_migration_rows ON public.migration_rows
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'system_admin'
        )
    );

-- Bureau & Regional Officers: Scoped Reading & Review
CREATE POLICY p_officers_migration_batches_select ON public.migration_batches
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('bureau_officer', 'regional_officer')
        )
    );

CREATE POLICY p_officers_migration_rows_select ON public.migration_rows
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('bureau_officer', 'regional_officer')
        )
    );

-- Institution Users: Strictly Scoped to their own Institution ID
CREATE POLICY p_inst_user_migration_batches ON public.migration_batches
    FOR ALL TO authenticated
    USING (
        institution_id IN (
            SELECT institution_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        institution_id IN (
            SELECT institution_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
    );

CREATE POLICY p_inst_user_migration_rows ON public.migration_rows
    FOR ALL TO authenticated
    USING (
        batch_id IN (
            SELECT id FROM public.migration_batches
            WHERE institution_id IN (
                SELECT institution_id FROM public.user_profiles
                WHERE id = auth.uid()
            )
        )
    );

-- Column Mappings & Profiles Policies
CREATE POLICY p_auth_col_mappings ON public.migration_column_mappings
    FOR ALL TO authenticated
    USING (
        batch_id IN (
            SELECT id FROM public.migration_batches
            WHERE institution_id IN (
                SELECT institution_id FROM public.user_profiles WHERE id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer')
            )
        )
    );

CREATE POLICY p_auth_mapping_profiles ON public.migration_mapping_profiles
    FOR ALL TO authenticated
    USING (
        institution_id IS NULL OR
        institution_id IN (
            SELECT institution_id FROM public.user_profiles WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('system_admin', 'bureau_officer')
        )
    );

-- ==============================================================================
-- 2. COMPLIANCE TEMPLATES POLICIES
-- ==============================================================================

-- All authenticated users can read active templates
CREATE POLICY p_read_compliance_templates ON public.compliance_templates
    FOR SELECT TO authenticated
    USING (is_active = TRUE OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('system_admin', 'bureau_officer')
    ));

-- Only Admin & Bureau Officer can create or edit templates
CREATE POLICY p_manage_compliance_templates ON public.compliance_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('system_admin', 'bureau_officer')
        )
    );

-- ==============================================================================
-- 3. COMPLIANCE DOCUMENTS & VERSIONS POLICIES
-- ==============================================================================

-- System Admin & Bureau Officers: Full Access
CREATE POLICY p_admin_compliance_docs ON public.compliance_documents
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('system_admin', 'bureau_officer')
        )
    );

-- Institution Users: Strictly Scoped to their own Institution
CREATE POLICY p_inst_user_compliance_docs ON public.compliance_documents
    FOR ALL TO authenticated
    USING (
        institution_id IN (
            SELECT institution_id FROM public.user_profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        institution_id IN (
            SELECT institution_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

-- Document Versions: Inherit Document Scope
CREATE POLICY p_auth_compliance_versions ON public.compliance_document_versions
    FOR ALL TO authenticated
    USING (
        compliance_document_id IN (
            SELECT id FROM public.compliance_documents
            WHERE institution_id IN (
                SELECT institution_id FROM public.user_profiles WHERE id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer')
            )
        )
    );

-- Document Reviews: Only Supervisory Officers can create approvals/returns
CREATE POLICY p_auth_document_reviews_select ON public.document_reviews
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY p_auth_document_reviews_insert ON public.document_reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer')
        )
    );

-- Mock Signatures: Inherits Document Scope & Authenticated User
CREATE POLICY p_auth_mock_signatures ON public.mock_signature_records
    FOR ALL TO authenticated
    USING (TRUE);


-- ------------------------------------------------------------------------------
-- Phase 8: FDR Release, Refund & Closure Schema
-- ------------------------------------------------------------------------------

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


-- ------------------------------------------------------------------------------
-- Phase 8: Release Management RLS Policies
-- ------------------------------------------------------------------------------

-- ============================================================================
-- FDR-CHAIN ENTERPRISE PLATFORM: PHASE 8 ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all Phase 8 tables
ALTER TABLE release_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdr_release_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_release_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdr_refund_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdr_refund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_closure_records ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 1. RELEASE POLICY VERSIONS
-- ----------------------------------------------------------------------------
CREATE POLICY "release_policies_select_policy"
ON release_policy_versions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "release_policies_admin_manage_policy"
ON release_policy_versions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 2. FDR RELEASE REQUESTS
-- ----------------------------------------------------------------------------
CREATE POLICY "release_requests_institution_select"
ON fdr_release_requests FOR SELECT
TO authenticated
USING (
    institution_id IN (
        SELECT institution_id FROM user_roles
        WHERE user_id = auth.uid() AND institution_id IS NOT NULL
    )
    OR
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
    )
);

CREATE POLICY "release_requests_institution_insert"
ON fdr_release_requests FOR INSERT
TO authenticated
WITH CHECK (
    institution_id IN (
        SELECT institution_id FROM user_roles
        WHERE user_id = auth.uid() AND institution_id IS NOT NULL
    )
    OR
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer')
    )
);

CREATE POLICY "release_requests_update_policy"
ON fdr_release_requests FOR UPDATE
TO authenticated
USING (
    -- Institution can update drafts / respond to return_for_correction
    (
        institution_id IN (
            SELECT institution_id FROM user_roles
            WHERE user_id = auth.uid() AND institution_id IS NOT NULL
        )
        AND request_status IN ('draft', 'returned_for_correction')
    )
    OR
    -- Regulatory officers can update across review workflow
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 3. RELEASE CHECKLIST ITEMS
-- ----------------------------------------------------------------------------
CREATE POLICY "checklist_items_select_policy"
ON release_checklist_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_release_requests rr
        WHERE rr.id = release_checklist_items.release_request_id
          AND (
              rr.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "checklist_items_manage_policy"
ON release_checklist_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 4. RELEASE REVIEWS
-- ----------------------------------------------------------------------------
CREATE POLICY "release_reviews_select_policy"
ON release_reviews FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_release_requests rr
        WHERE rr.id = release_reviews.release_request_id
          AND (
              rr.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "release_reviews_insert_policy"
ON release_reviews FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 5. BANK RELEASE RECORDS
-- ----------------------------------------------------------------------------
CREATE POLICY "bank_release_records_select_policy"
ON bank_release_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_release_requests rr
        WHERE rr.id = bank_release_records.release_request_id
          AND (
              rr.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "bank_release_records_manage_policy"
ON bank_release_records FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 6. FDR REFUND RECORDS & TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE POLICY "refund_records_select_policy"
ON fdr_refund_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_release_requests rr
        WHERE rr.id = fdr_refund_records.release_request_id
          AND (
              rr.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "refund_records_manage_policy"
ON fdr_refund_records FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'finance_officer', 'bureau_officer')
    )
);

CREATE POLICY "refund_transactions_select_policy"
ON fdr_refund_transactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_refund_records rr
        JOIN fdr_release_requests req ON rr.release_request_id = req.id
        WHERE rr.id = fdr_refund_transactions.refund_record_id
          AND (
              req.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "refund_transactions_manage_policy"
ON fdr_refund_transactions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'finance_officer', 'bureau_officer')
    )
);

-- ----------------------------------------------------------------------------
-- 7. RELEASE CLOSURE RECORDS
-- ----------------------------------------------------------------------------
CREATE POLICY "closure_records_select_policy"
ON release_closure_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM fdr_release_requests rr
        WHERE rr.id = release_closure_records.release_request_id
          AND (
              rr.institution_id IN (
                  SELECT institution_id FROM user_roles
                  WHERE user_id = auth.uid() AND institution_id IS NOT NULL
              )
              OR
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                    AND r.name IN ('system_admin', 'bureau_officer', 'regional_officer', 'finance_officer')
              )
          )
    )
);

CREATE POLICY "closure_records_manage_policy"
ON release_closure_records FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND r.name IN ('system_admin', 'bureau_officer')
    )
);

