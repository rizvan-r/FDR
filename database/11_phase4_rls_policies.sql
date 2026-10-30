-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
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
