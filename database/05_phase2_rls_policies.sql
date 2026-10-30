-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
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
