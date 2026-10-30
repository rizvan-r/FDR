-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
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
