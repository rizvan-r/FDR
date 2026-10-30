-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
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
