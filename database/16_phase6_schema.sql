-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
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
