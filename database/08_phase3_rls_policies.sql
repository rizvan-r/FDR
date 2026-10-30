-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
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
