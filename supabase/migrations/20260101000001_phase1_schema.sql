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
