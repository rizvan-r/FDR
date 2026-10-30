-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
-- Phase 4: Seed Policies, Heartbeat Checks & Regulatory Alerts
-- ==============================================================================

-- 1. SEED DEFAULT AND CRITICAL HEARTBEAT POLICIES
INSERT INTO public.heartbeat_policies (
    id,
    name,
    heartbeat_interval_days,
    stale_after_days,
    response_timeout_hours,
    max_retries,
    retry_interval_hours,
    maturity_alert_days,
    is_active,
    is_default
) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Standard Regulatory Cadence (30-Day Interval)',
    30,
    45,
    48,
    3,
    24,
    '{90,60,30,7,1,0}',
    TRUE,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000002',
    'High-Value Deposit Accelerated Cadence (14-Day Interval)',
    14,
    21,
    24,
    2,
    12,
    '{90,60,30,14,7,1,0}',
    TRUE,
    FALSE
)
ON CONFLICT (name) DO UPDATE SET
    heartbeat_interval_days = EXCLUDED.heartbeat_interval_days,
    stale_after_days = EXCLUDED.stale_after_days,
    response_timeout_hours = EXCLUDED.response_timeout_hours,
    max_retries = EXCLUDED.max_retries,
    retry_interval_hours = EXCLUDED.retry_interval_hours;


-- 2. INITIALIZE HEARTBEAT TIMESTAMPS AND STATUSES ON EXISTING SEED FDRS
UPDATE public.fdrs
SET 
    heartbeat_status = 'alive'::fdr_heartbeat_enum,
    last_heartbeat_at = NOW() - INTERVAL '5 days',
    next_heartbeat_at = NOW() + INTERVAL '25 days',
    heartbeat_failure_count = 0
WHERE fdr_number = 'FDR-2026-NHAI-84920';

UPDATE public.fdrs
SET 
    heartbeat_status = 'alive'::fdr_heartbeat_enum,
    last_heartbeat_at = NOW() - INTERVAL '12 days',
    next_heartbeat_at = NOW() + INTERVAL '18 days',
    heartbeat_failure_count = 0
WHERE fdr_number = 'FDR-2026-CPWD-10294';

UPDATE public.fdrs
SET 
    heartbeat_status = 'stale'::fdr_heartbeat_enum,
    last_heartbeat_at = NOW() - INTERVAL '48 days',
    next_heartbeat_at = NOW() - INTERVAL '18 days',
    heartbeat_failure_count = 1
WHERE fdr_number = 'FDR-2025-AICTE-55912';

UPDATE public.fdrs
SET 
    heartbeat_status = 'unresponsive'::fdr_heartbeat_enum,
    last_heartbeat_at = NOW() - INTERVAL '90 days',
    next_heartbeat_at = NOW() - INTERVAL '60 days',
    heartbeat_failure_count = 4
WHERE fdr_number = 'FDR-2025-DRDO-77291';


-- 3. SEED INITIAL SAMPLE FDR ALERTS
INSERT INTO public.fdr_alerts (
    id,
    fdr_id,
    institution_id,
    alert_type,
    severity,
    title,
    description,
    due_at,
    is_read,
    is_resolved
)
SELECT 
    '00000000-0000-0000-0000-000000000011'::uuid,
    f.id,
    f.institution_id,
    'heartbeat_stale',
    'high',
    'Heartbeat Overdue - Freshness Threshold Exceeded',
    'Deposit has not received verified bank re-attestation for over 45 days. Automatic verification request dispatched.',
    NOW() - INTERVAL '3 days',
    FALSE,
    FALSE
FROM public.fdrs f
WHERE f.fdr_number = 'FDR-2025-AICTE-55912'
ON CONFLICT DO NOTHING;

INSERT INTO public.fdr_alerts (
    id,
    fdr_id,
    institution_id,
    alert_type,
    severity,
    title,
    description,
    due_at,
    is_read,
    is_resolved
)
SELECT 
    '00000000-0000-0000-0000-000000000012'::uuid,
    f.id,
    f.institution_id,
    'heartbeat_unresponsive',
    'critical',
    'Bank Unresponsive - Exhausted Maximum Retry Limit',
    'Depository branch failed to acknowledge 3 consecutive heartbeat confirmation attempts. Escalate to Bank Nodal Officer.',
    NOW() - INTERVAL '10 days',
    FALSE,
    FALSE
FROM public.fdrs f
WHERE f.fdr_number = 'FDR-2025-DRDO-77291'
ON CONFLICT DO NOTHING;

INSERT INTO public.fdr_alerts (
    id,
    fdr_id,
    institution_id,
    alert_type,
    severity,
    title,
    description,
    due_at,
    is_read,
    is_resolved
)
SELECT 
    '00000000-0000-0000-0000-000000000013'::uuid,
    f.id,
    f.institution_id,
    'maturity_30_days',
    'medium',
    'Maturity Approaching Within 30 Days',
    'Deposit reaches statutory maturity within 30 days. Action required: initiate renewal verification or lien discharge audit.',
    f.maturity_date::timestamptz,
    FALSE,
    FALSE
FROM public.fdrs f
WHERE f.fdr_number = 'FDR-2026-CPWD-10294'
ON CONFLICT DO NOTHING;
