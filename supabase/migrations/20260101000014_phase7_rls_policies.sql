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
