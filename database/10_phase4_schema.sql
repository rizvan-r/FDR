-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
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
