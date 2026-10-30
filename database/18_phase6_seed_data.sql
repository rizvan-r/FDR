-- ==============================================================================
-- FDR-Chain: Fixed Deposit Receipt Management Portal (SIH 2026)
-- Phase 6: Seed Data for Officer Workspace, Tasks, and Policies
-- ==============================================================================

-- 1. SEED DEFAULT QUEUE POLICY
INSERT INTO public.queue_policies (
    id,
    name,
    is_active,
    is_default,
    weights,
    thresholds,
    deadline_rules,
    escalation_rules
) VALUES (
    'd1000000-0000-0000-0000-000000000001',
    'Standard Regulatory Priority & Escalation Policy',
    TRUE,
    TRUE,
    '{
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
    '{
        "critical": 100,
        "high": 70,
        "medium": 35,
        "low": 0
    }'::jsonb,
    '{
        "broken_fdr_hours": 24,
        "unresponsive_hours": 48,
        "stale_heartbeat_days": 5,
        "renewal_review_days": 3,
        "standard_verification_days": 2
    }'::jsonb,
    '{
        "critical_immediate_notify": true,
        "overdue_escalation_hours": 24,
        "level_1_target_role": "regional_officer",
        "level_2_target_role": "bureau_officer"
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;


-- 2. SEED INITIAL OFFICER TASKS
INSERT INTO public.officer_tasks (
    id,
    task_type,
    source_type,
    source_id,
    fdr_number,
    title,
    description,
    priority_score,
    priority_level,
    priority_reasons,
    task_status,
    due_at,
    dedup_key
) VALUES 
(
    'e6000000-0000-0000-0000-000000000001',
    'broken_fdr_review',
    'fdr_alert',
    'a1000000-0000-0000-0000-000000000001',
    'FDR-2025-DRDO-77291',
    'Critical Lien Breach / Broken Standing Investigation',
    'State Bank of India reported statutory lien discharged on reserve deposit FDR-2025-DRDO-77291. Immediate regulatory inquiry required.',
    130,
    'critical',
    '[
        {"code": "broken_fdr", "points": 100, "description": "Deposit flagged as Broken / Lien Breach"},
        {"code": "escalated_case", "points": 30, "description": "Case escalated to Bureau Supervisor"}
    ]'::jsonb,
    'open',
    NOW() + INTERVAL '12 hours',
    'fdr_alert:a1000000-0000-0000-0000-000000000001:broken_fdr_review'
),
(
    'e6000000-0000-0000-0000-000000000002',
    'unresponsive_heartbeat_review',
    'heartbeat_check',
    'c1000000-0000-0000-0000-000000000002',
    'FDR-2026-CPWD-10294',
    'Depository Branch Unresponsive to Heartbeat Attestation',
    'Punjab National Bank branch failed to acknowledge or respond to 3 consecutive heartbeat confirmation attempts. Escalate to Bank Nodal Officer.',
    85,
    'high',
    '[
        {"code": "unresponsive_heartbeat", "points": 70, "description": "Bank failed all automated retries"},
        {"code": "missing_evidence", "points": 15, "description": "Freshness attestation missing"}
    ]'::jsonb,
    'in_progress',
    NOW() + INTERVAL '24 hours',
    'heartbeat_check:c1000000-0000-0000-0000-000000000002:unresponsive_heartbeat_review'
),
(
    'e6000000-0000-0000-0000-000000000003',
    'renewal_approval',
    'renewal_case',
    'e3000000-0000-0000-0000-000000000001',
    'FDR-2023-SBI-001',
    'Review Renewal Case REN-2026-0001 for SBI Rollover',
    'National Institute of Technology submitted replacement deposit FDR-2026-SBI-005. 6-signal matching score 85.00 (High). Awaiting officer review.',
    55,
    'medium',
    '[
        {"code": "renewal_awaiting_review", "points": 20, "description": "Renewal case submitted and pending decision"},
        {"code": "deadline_within_7d", "points": 20, "description": "Maturity transition deadline approaching"},
        {"code": "missing_evidence", "points": 15, "description": "Board resolution pending officer review"}
    ]'::jsonb,
    'open',
    NOW() + INTERVAL '48 hours',
    'renewal_case:e3000000-0000-0000-0000-000000000001:renewal_approval'
),
(
    'e6000000-0000-0000-0000-000000000004',
    'stale_heartbeat_review',
    'fdr_alert',
    'a1000000-0000-0000-0000-000000000003',
    'FDR-2025-AICTE-55912',
    'Stale Heartbeat Attestation - 45-Day Threshold Exceeded',
    'Deposit has not received verified bank re-attestation for over 45 days. Fresh check dispatch required.',
    40,
    'medium',
    '[
        {"code": "stale_heartbeat", "points": 40, "description": "Heartbeat attestation window expired"}
    ]'::jsonb,
    'open',
    NOW() + INTERVAL '3 days',
    'fdr_alert:a1000000-0000-0000-0000-000000000003:stale_heartbeat_review'
)
ON CONFLICT (id) DO NOTHING;
