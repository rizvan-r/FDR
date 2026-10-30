-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
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
