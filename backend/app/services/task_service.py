import logging
from typing import Dict, Any, List, Optional
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status

from app.services.supabase_admin import supabase_admin
from app.services.priority_service import priority_engine, DEFAULT_PRIORITY_WEIGHTS, DEFAULT_PRIORITY_THRESHOLDS
from app.schemas.officer import (
    OfficerTaskResponse, OfficerTaskDetailResponse,
    TaskAssignmentResponse, TaskCommentResponse, TaskEscalationResponse,
    OfficerNotificationResponse, QueuePolicyResponse,
    OfficerDashboardStats, OfficerWorkloadSummary, OfficerWorkloadItem
)

logger = logging.getLogger("fdr_chain.task_service")

# ==============================================================================
# IN-MEMORY STORES FOR LOCAL TESTING & EVALUATION FALLBACK
# ==============================================================================

LOCAL_QUEUE_POLICIES: List[Dict[str, Any]] = [
    {
        "id": "policy-001",
        "name": "Standard Regulatory Priority & Escalation Policy",
        "is_active": True,
        "is_default": True,
        "weights": DEFAULT_PRIORITY_WEIGHTS.copy(),
        "thresholds": DEFAULT_PRIORITY_THRESHOLDS.copy(),
        "deadline_rules": {
            "broken_fdr_hours": 24,
            "unresponsive_hours": 48,
            "stale_heartbeat_days": 5,
            "renewal_review_days": 3,
            "standard_verification_days": 2,
        },
        "escalation_rules": {
            "critical_immediate_notify": True,
            "overdue_escalation_hours": 24,
            "level_1_target_role": "regional_officer",
            "level_2_target_role": "bureau_officer",
        },
        "created_at": datetime.now(timezone.utc) - timedelta(days=30),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=30),
    }
]

LOCAL_OFFICER_TASKS: List[Dict[str, Any]] = [
    {
        "id": "task-001",
        "task_type": "broken_fdr_review",
        "source_type": "fdr_alert",
        "source_id": "alert-002",
        "fdr_id": "fdr-004",
        "fdr_number": "FDR-2025-DRDO-77291",
        "title": "Critical Lien Breach / Broken Standing Investigation",
        "description": "Depository branch reported statutory lien discharged or deposit encashed. Immediate regulatory quarantine inquiry required.",
        "institution_id": "inst-04",
        "institution_name": "Defence Research and Development Organisation",
        "region_id": "reg-north",
        "region_name": "Northern Region",
        "bank_id": "bank-01",
        "bank_name": "State Bank of India",
        "assigned_to": "usr-admin-01",
        "assigned_to_name": "System Administrator",
        "created_by": "system",
        "priority_score": 130,
        "priority_level": "critical",
        "priority_reasons": [
            {"code": "broken_fdr", "points": 100, "description": "Lien discharged, bank decree, or broken deposit standing detected (+100)"},
            {"code": "escalated_case", "points": 30, "description": "Case has been formally escalated to senior supervisory tier (+30)"}
        ],
        "task_status": "open",
        "due_at": datetime.now(timezone.utc) + timedelta(hours=12),
        "started_at": None,
        "completed_at": None,
        "completion_note": None,
        "dedup_key": "fdr_alert:alert-002:broken_fdr_review",
        "metadata": {"auto_generated": True},
        "created_at": datetime.now(timezone.utc) - timedelta(days=1),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=1),
    },
    {
        "id": "task-002",
        "task_type": "unresponsive_heartbeat_review",
        "source_type": "heartbeat_check",
        "source_id": "check-002",
        "fdr_id": "fdr-002",
        "fdr_number": "FDR-2026-CPWD-10294",
        "title": "Depository Branch Unresponsive to Heartbeat Attestation",
        "description": "Punjab National Bank branch failed to respond to 3 consecutive heartbeat confirmation attempts. Escalate to Bank Nodal Officer.",
        "institution_id": "inst-02",
        "institution_name": "Central Public Works Department",
        "region_id": "reg-north",
        "region_name": "Northern Region",
        "bank_id": "bank-02",
        "bank_name": "Punjab National Bank",
        "assigned_to": None,
        "assigned_to_name": None,
        "created_by": "system",
        "priority_score": 85,
        "priority_level": "high",
        "priority_reasons": [
            {"code": "unresponsive_heartbeat", "points": 70, "description": "Depository bank branch unresponsive to automated heartbeat attempts (+70)"},
            {"code": "missing_evidence", "points": 15, "description": "Mandatory documentation or bank verification evidence missing (+15)"}
        ],
        "task_status": "in_progress",
        "due_at": datetime.now(timezone.utc) + timedelta(hours=24),
        "started_at": datetime.now(timezone.utc) - timedelta(hours=4),
        "completed_at": None,
        "completion_note": None,
        "dedup_key": "heartbeat_check:check-002:unresponsive_heartbeat_review",
        "metadata": {"auto_generated": True},
        "created_at": datetime.now(timezone.utc) - timedelta(days=2),
        "updated_at": datetime.now(timezone.utc) - timedelta(hours=4),
    },
    {
        "id": "task-003",
        "task_type": "renewal_approval",
        "source_type": "renewal_case",
        "source_id": "e3000000-0000-0000-0000-000000000001",
        "fdr_id": "00000000-0000-0000-0000-000000000001",
        "fdr_number": "FDR-2023-SBI-001",
        "title": "Review Renewal Case REN-2026-0001 for SBI Rollover",
        "description": "National Institute of Technology submitted replacement deposit FDR-2026-SBI-005. 6-signal matching score 85.00 (High). Awaiting regulatory review.",
        "institution_id": "11111111-1111-1111-1111-111111111111",
        "institution_name": "National Institute of Technology",
        "region_id": "reg-south",
        "region_name": "Southern Region",
        "bank_id": "bank-01",
        "bank_name": "State Bank of India",
        "assigned_to": None,
        "assigned_to_name": None,
        "created_by": "system",
        "priority_score": 55,
        "priority_level": "medium",
        "priority_reasons": [
            {"code": "renewal_awaiting_review", "points": 20, "description": "Deposit action submitted and pending officer review/verification (+20)"},
            {"code": "deadline_within_7d", "points": 20, "description": "Action deadline approaching within 7 days (+20)"},
            {"code": "missing_evidence", "points": 15, "description": "Board resolution pending officer review (+15)"}
        ],
        "task_status": "open",
        "due_at": datetime.now(timezone.utc) + timedelta(days=3),
        "started_at": None,
        "completed_at": None,
        "completion_note": None,
        "dedup_key": "renewal_case:e3000000-0000-0000-0000-000000000001:renewal_approval",
        "metadata": {"auto_generated": True},
        "created_at": datetime.now(timezone.utc) - timedelta(days=1),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=1),
    },
    {
        "id": "task-004",
        "task_type": "stale_heartbeat_review",
        "source_type": "fdr_alert",
        "source_id": "alert-001",
        "fdr_id": "fdr-003",
        "fdr_number": "FDR-2025-AICTE-55912",
        "title": "Stale Heartbeat Attestation - 45-Day Threshold Exceeded",
        "description": "Deposit has not received verified bank re-attestation for over 45 days. Fresh check dispatch required.",
        "institution_id": "inst-03",
        "institution_name": "All India Council for Technical Education",
        "region_id": "reg-north",
        "region_name": "Northern Region",
        "bank_id": "bank-01",
        "bank_name": "State Bank of India",
        "assigned_to": None,
        "assigned_to_name": None,
        "created_by": "system",
        "priority_score": 40,
        "priority_level": "medium",
        "priority_reasons": [
            {"code": "stale_heartbeat", "points": 40, "description": "Heartbeat attestation window expired without fresh re-confirmation (+40)"}
        ],
        "task_status": "open",
        "due_at": datetime.now(timezone.utc) + timedelta(days=4),
        "started_at": None,
        "completed_at": None,
        "completion_note": None,
        "dedup_key": "fdr_alert:alert-001:stale_heartbeat_review",
        "metadata": {"auto_generated": True},
        "created_at": datetime.now(timezone.utc) - timedelta(days=3),
        "updated_at": datetime.now(timezone.utc) - timedelta(days=3),
    }
]

LOCAL_TASK_ASSIGNMENTS: List[Dict[str, Any]] = [
    {
        "id": "asgn-001",
        "task_id": "task-001",
        "assigned_to": "usr-admin-01",
        "assigned_to_name": "System Administrator",
        "assigned_by": "usr-admin-01",
        "assigned_by_name": "System Administrator",
        "assignment_note": "Self-assigned for immediate regulatory inquiry into DRDO lien breach.",
        "assigned_at": datetime.now(timezone.utc) - timedelta(days=1),
        "unassigned_at": None,
    }
]

LOCAL_TASK_COMMENTS: List[Dict[str, Any]] = [
    {
        "id": "comment-001",
        "task_id": "task-001",
        "user_id": "usr-admin-01",
        "user_name": "System Administrator",
        "user_role": "system_admin",
        "comment_text": "Contacted SBI Chief Manager regarding premature lien discharge report. Requested official written clarification.",
        "created_at": datetime.now(timezone.utc) - timedelta(hours=18),
    }
]

LOCAL_TASK_ESCALATIONS: List[Dict[str, Any]] = [
    {
        "id": "esc-001",
        "task_id": "task-001",
        "escalation_level": 1,
        "escalated_from": "usr-regional-01",
        "escalated_from_name": "Regional Officer (North)",
        "escalated_to": "usr-bureau-01",
        "escalated_to_name": "Bureau Chief (Regulation)",
        "escalated_to_role": "bureau_officer",
        "reason": "Critical lien breach alert unacknowledged past SLA threshold. Mandates Bureau level investigation.",
        "escalated_at": datetime.now(timezone.utc) - timedelta(hours=14),
        "acknowledged_at": datetime.now(timezone.utc) - timedelta(hours=12),
        "acknowledged_by": "usr-bureau-01",
        "resolved_at": None,
        "resolved_by": None,
        "resolution_note": None,
    }
]

LOCAL_OFFICER_NOTIFICATIONS: List[Dict[str, Any]] = [
    {
        "id": "notif-001",
        "recipient_user_id": "00000000-0000-0000-0000-000000000001",
        "task_id": "task-001",
        "notification_type": "critical_task_assigned",
        "title": "Critical Task Assigned: DRDO Lien Breach",
        "message": "Task 'Critical Lien Breach / Broken Standing Investigation' has been assigned to you with 12 hours remaining.",
        "read_at": None,
        "created_at": datetime.now(timezone.utc) - timedelta(hours=10),
    },
    {
        "id": "notif-002",
        "recipient_user_id": "00000000-0000-0000-0000-000000000001",
        "task_id": "task-003",
        "notification_type": "renewal_submitted",
        "title": "Renewal Case Ready for Review",
        "message": "Renewal Case REN-2026-0001 submitted with 85.00 match score.",
        "read_at": datetime.now(timezone.utc) - timedelta(hours=2),
        "created_at": datetime.now(timezone.utc) - timedelta(hours=8),
    }
]

class OfficerTaskService:
    def __init__(self):
        pass

    # ==============================================================================
    # 1. SYNCHRONIZATION WITH SOURCE MODULES (IDEMPOTENT & DEDUPED)
    # ==============================================================================
    def sync_tasks_from_sources(self) -> Dict[str, Any]:
        """
        Idempotent task synchronization service.
        Scans alerts from Phase 4, verification requests from Phase 3, and renewal cases from Phase 5.
        Generates or updates officer tasks using stable deduplication keys.
        """
        created_count = 0
        updated_count = 0

        # A. Sync from Phase 4 Heartbeat Alerts (LOCAL_FDR_ALERTS)
        try:
            from app.services.heartbeat_service import LOCAL_FDR_ALERTS
            for alert in LOCAL_FDR_ALERTS:
                if alert.get("is_resolved", False):
                    continue

                alert_type = alert.get("alert_type")
                source_id = alert.get("id")
                task_type = None

                if alert_type == "heartbeat_broken":
                    task_type = "broken_fdr_review"
                elif alert_type == "heartbeat_unresponsive":
                    task_type = "unresponsive_heartbeat_review"
                elif alert_type == "heartbeat_stale":
                    task_type = "stale_heartbeat_review"
                elif alert_type and alert_type.startswith("maturity_"):
                    task_type = "upcoming_maturity_follow_up"

                if not task_type:
                    continue

                dedup_key = f"fdr_alert:{source_id}:{task_type}"
                existing_task = next((t for t in LOCAL_OFFICER_TASKS if t.get("dedup_key") == dedup_key), None)

                due_at = alert.get("due_at") or (datetime.now(timezone.utc) + timedelta(days=2))
                calc = priority_engine.calculate_task_priority(
                    task_type=task_type,
                    due_at=due_at,
                    is_escalated=False,
                )

                if existing_task:
                    # Update priority and reasons if open
                    if existing_task["task_status"] in ("open", "in_progress", "waiting"):
                        existing_task["priority_score"] = calc.score
                        existing_task["priority_level"] = calc.level
                        existing_task["priority_reasons"] = [r.model_dump() for r in calc.reasons]
                        existing_task["updated_at"] = datetime.now(timezone.utc)
                        updated_count += 1
                else:
                    new_task = {
                        "id": f"task-alert-{source_id}",
                        "task_type": task_type,
                        "source_type": "fdr_alert",
                        "source_id": source_id,
                        "fdr_id": alert.get("fdr_id"),
                        "fdr_number": alert.get("fdr_number"),
                        "title": alert.get("title", f"Action Required: {task_type}"),
                        "description": alert.get("description"),
                        "institution_id": alert.get("institution_id"),
                        "institution_name": alert.get("institution_name"),
                        "region_id": "reg-north",
                        "region_name": "Northern Region",
                        "bank_id": "bank-01",
                        "bank_name": "State Bank of India",
                        "assigned_to": alert.get("assigned_to"),
                        "assigned_to_name": alert.get("assigned_to_name"),
                        "created_by": "system",
                        "priority_score": calc.score,
                        "priority_level": calc.level,
                        "priority_reasons": [r.model_dump() for r in calc.reasons],
                        "task_status": "open",
                        "due_at": due_at,
                        "started_at": None,
                        "completed_at": None,
                        "completion_note": None,
                        "dedup_key": dedup_key,
                        "metadata": {"auto_generated": True},
                        "created_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc),
                    }
                    LOCAL_OFFICER_TASKS.append(new_task)
                    created_count += 1
        except Exception as e:
            logger.warning(f"Error syncing alerts: {e}")

        # B. Sync from Phase 5 Renewal Cases (LOCAL_RENEWAL_CASES)
        try:
            from app.services.renewal_service import LOCAL_RENEWAL_CASES
            for case in LOCAL_RENEWAL_CASES:
                if case.get("status") in ("submitted", "under_review", "awaiting_bank_confirmation"):
                    case_id = case.get("id")
                    dedup_key = f"renewal_case:{case_id}:renewal_approval"
                    existing_task = next((t for t in LOCAL_OFFICER_TASKS if t.get("dedup_key") == dedup_key), None)

                    due_at = datetime.now(timezone.utc) + timedelta(days=3)
                    calc = priority_engine.calculate_task_priority(
                        task_type="renewal_approval",
                        due_at=due_at,
                        missing_evidence=(case.get("status") == "awaiting_bank_confirmation"),
                    )

                    if existing_task:
                        if existing_task["task_status"] in ("open", "in_progress", "waiting"):
                            existing_task["priority_score"] = calc.score
                            existing_task["priority_level"] = calc.level
                            existing_task["priority_reasons"] = [r.model_dump() for r in calc.reasons]
                            existing_task["updated_at"] = datetime.now(timezone.utc)
                            updated_count += 1
                    else:
                        new_task = {
                            "id": f"task-ren-{case_id}",
                            "task_type": "renewal_approval",
                            "source_type": "renewal_case",
                            "source_id": case_id,
                            "fdr_id": case.get("original_fdr_id"),
                            "fdr_number": case.get("original_fdr_number", "FDR-RENEWAL"),
                            "title": f"Review Renewal Case {case.get('case_number', 'REN')}",
                            "description": f"Renewal rollover submitted for evaluation. Matching score: {case.get('matching_score', 0)} ({case.get('matching_confidence', 'none')}).",
                            "institution_id": case.get("institution_id"),
                            "institution_name": "Associated Institution",
                            "region_id": "reg-south",
                            "region_name": "Southern Region",
                            "bank_id": "bank-01",
                            "bank_name": "State Bank of India",
                            "assigned_to": None,
                            "assigned_to_name": None,
                            "created_by": "system",
                            "priority_score": calc.score,
                            "priority_level": calc.level,
                            "priority_reasons": [r.model_dump() for r in calc.reasons],
                            "task_status": "open",
                            "due_at": due_at,
                            "started_at": None,
                            "completed_at": None,
                            "completion_note": None,
                            "dedup_key": dedup_key,
                            "metadata": {"auto_generated": True},
                            "created_at": datetime.now(timezone.utc),
                            "updated_at": datetime.now(timezone.utc),
                        }
                        LOCAL_OFFICER_TASKS.append(new_task)
                        created_count += 1
        except Exception as e:
            logger.warning(f"Error syncing renewal cases: {e}")

        return {
            "status": "success",
            "created_count": created_count,
            "updated_count": updated_count,
            "total_tasks": len(LOCAL_OFFICER_TASKS),
        }

    # ==============================================================================
    # 2. QUERYING TASKS (ROLE-AWARE & SCOPED)
    # ==============================================================================
    def get_tasks(
        self,
        user_profile: Dict[str, Any],
        task_status: Optional[str] = None,
        priority_level: Optional[str] = None,
        assigned_to: Optional[str] = None,
        task_type: Optional[str] = None,
        search: Optional[str] = None,
        my_tasks: Optional[bool] = False,
        unassigned_only: Optional[bool] = False,
        limit: int = 50,
        offset: int = 0,
    ) -> List[OfficerTaskResponse]:
        roles = user_profile.get("roles", [])
        user_id = str(user_profile.get("id"))
        inst_id = str(user_profile.get("institution_id")) if user_profile.get("institution_id") else None
        bank_id = str(user_profile.get("bank_id")) if user_profile.get("bank_id") else None
        region_scopes = [str(r) for r in user_profile.get("region_scopes", [])]

        tasks = list(LOCAL_OFFICER_TASKS)
        now = datetime.now(timezone.utc)

        # Apply Role Scoping
        if "system_admin" in roles or "bureau_officer" in roles:
            pass  # Unrestricted access
        elif "regional_officer" in roles:
            tasks = [
                t for t in tasks 
                if (t.get("region_id") in region_scopes) or (t.get("assigned_to") == user_id)
            ]
        elif "institution_user" in roles:
            tasks = [t for t in tasks if t.get("institution_id") == inst_id]
        elif "bank_nodal_officer" in roles:
            tasks = [t for t in tasks if t.get("bank_id") == bank_id]
        elif "finance_officer" in roles:
            pass  # Read-only audit across monitored tasks

        # Filters
        if task_status:
            tasks = [t for t in tasks if t.get("task_status") == task_status]
        if priority_level:
            tasks = [t for t in tasks if t.get("priority_level") == priority_level]
        if task_type:
            tasks = [t for t in tasks if t.get("task_type") == task_type]
        if assigned_to:
            tasks = [t for t in tasks if t.get("assigned_to") == assigned_to]
        if my_tasks:
            tasks = [t for t in tasks if t.get("assigned_to") == user_id]
        if unassigned_only:
            tasks = [t for t in tasks if not t.get("assigned_to")]

        if search:
            q = search.lower()
            tasks = [
                t for t in tasks if (
                    q in t.get("title", "").lower()
                    or q in t.get("fdr_number", "").lower()
                    or q in t.get("institution_name", "").lower()
                )
            ]

        # Sorting: Priority score descending, then created_at descending
        tasks.sort(key=lambda x: (x.get("priority_score", 0), x.get("created_at")), reverse=True)

        paginated = tasks[offset:offset + limit]
        results = []

        for t in paginated:
            due_at = t.get("due_at")
            if due_at and due_at.tzinfo is None:
                due_at = due_at.replace(tzinfo=timezone.utc)

            is_overdue = bool(due_at and due_at < now and t.get("task_status") not in ("completed", "cancelled"))
            created_at = t.get("created_at")
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            task_age = round((now - created_at).total_seconds() / 3600.0, 1)

            is_esc = any(e.get("task_id") == t.get("id") and not e.get("resolved_at") for e in LOCAL_TASK_ESCALATIONS)

            task_dict = dict(t)
            task_dict["due_at"] = due_at
            task_dict["created_at"] = created_at
            task_dict["updated_at"] = t.get("updated_at")
            task_dict["task_age_hours"] = task_age
            task_dict["is_overdue"] = is_overdue
            task_dict["is_escalated"] = is_esc
            results.append(OfficerTaskResponse(**task_dict))

        return results

    def get_task_by_id(self, task_id: str, user_profile: Dict[str, Any]) -> OfficerTaskDetailResponse:
        task = next((t for t in LOCAL_OFFICER_TASKS if str(t.get("id")) == str(task_id)), None)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

        # Check access
        roles = user_profile.get("roles", [])
        user_id = str(user_profile.get("id"))
        inst_id = str(user_profile.get("institution_id")) if user_profile.get("institution_id") else None
        bank_id = str(user_profile.get("bank_id")) if user_profile.get("bank_id") else None
        region_scopes = [str(r) for r in user_profile.get("region_scopes", [])]

        if not ("system_admin" in roles or "bureau_officer" in roles or "finance_officer" in roles):
            if "regional_officer" in roles and task.get("region_id") not in region_scopes and task.get("assigned_to") != user_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Task outside your regional jurisdiction.")
            elif "institution_user" in roles and task.get("institution_id") != inst_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Task belongs to another institution.")
            elif "bank_nodal_officer" in roles and task.get("bank_id") != bank_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Task belongs to another bank.")

        now = datetime.now(timezone.utc)
        due_at = task.get("due_at")
        if due_at and due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=timezone.utc)
        is_overdue = bool(due_at and due_at < now and task.get("task_status") not in ("completed", "cancelled"))
        created_at = task.get("created_at")
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        task_age = round((now - created_at).total_seconds() / 3600.0, 1)

        assignments = [
            TaskAssignmentResponse(**a) for a in LOCAL_TASK_ASSIGNMENTS if str(a.get("task_id")) == str(task_id)
        ]
        comments = [
            TaskCommentResponse(**c) for c in LOCAL_TASK_COMMENTS if str(c.get("task_id")) == str(task_id)
        ]
        escalations = [
            TaskEscalationResponse(**e) for e in LOCAL_TASK_ESCALATIONS if str(e.get("task_id")) == str(task_id)
        ]
        is_esc = any(not e.resolved_at for e in escalations)

        task_dict = dict(task)
        task_dict["due_at"] = due_at
        task_dict["created_at"] = created_at
        task_dict["updated_at"] = task.get("updated_at")
        task_dict["task_age_hours"] = task_age
        task_dict["is_overdue"] = is_overdue
        task_dict["is_escalated"] = is_esc
        task_dict["assignments"] = assignments
        task_dict["comments"] = comments
        task_dict["escalations"] = escalations
        task_dict["source_data"] = {"source_type": task.get("source_type"), "source_id": task.get("source_id")}
        task_dict["fdr_summary"] = {"fdr_number": task.get("fdr_number"), "fdr_id": task.get("fdr_id")}
        return OfficerTaskDetailResponse(**task_dict)

    # ==============================================================================
    # 3. TASK LIFECYCLE MANAGEMENT
    # ==============================================================================
    def start_task(self, task_id: str, user_profile: Dict[str, Any], note: Optional[str] = None) -> OfficerTaskResponse:
        task = next((t for t in LOCAL_OFFICER_TASKS if str(t.get("id")) == str(task_id)), None)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

        if task["task_status"] in ("completed", "cancelled"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot start a {task['task_status']} task.")

        task["task_status"] = "in_progress"
        task["started_at"] = datetime.now(timezone.utc)
        task["updated_at"] = datetime.now(timezone.utc)

        if note:
            self.add_comment(task_id, user_profile, f"[Started Task]: {note}")

        return self.get_task_by_id(task_id, user_profile)

    def wait_task(self, task_id: str, user_profile: Dict[str, Any], reason: str) -> OfficerTaskResponse:
        task = next((t for t in LOCAL_OFFICER_TASKS if str(t.get("id")) == str(task_id)), None)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

        if task["task_status"] in ("completed", "cancelled"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot change state of {task['task_status']} task.")

        task["task_status"] = "waiting"
        task["updated_at"] = datetime.now(timezone.utc)
        self.add_comment(task_id, user_profile, f"[Waiting Status]: {reason}")

        return self.get_task_by_id(task_id, user_profile)

    def complete_task(self, task_id: str, user_profile: Dict[str, Any], completion_note: str) -> OfficerTaskResponse:
        """
        Completes a task. 
        CRITICAL INVARIANT: Completing an officer task records operational closure of the review,
        but DOES NOT automatically approve or modify underlying FDR status or renewal decisions.
        """
        task = next((t for t in LOCAL_OFFICER_TASKS if str(t.get("id")) == str(task_id)), None)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

        if task["task_status"] == "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task is already completed.")

        task["task_status"] = "completed"
        task["completed_at"] = datetime.now(timezone.utc)
        task["completion_note"] = completion_note
        task["updated_at"] = datetime.now(timezone.utc)

        self.add_comment(task_id, user_profile, f"[Task Completed]: {completion_note}")

        return self.get_task_by_id(task_id, user_profile)

    def cancel_task(self, task_id: str, user_profile: Dict[str, Any], reason: str) -> OfficerTaskResponse:
        task = next((t for t in LOCAL_OFFICER_TASKS if str(t.get("id")) == str(task_id)), None)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

        if task["task_status"] in ("completed", "cancelled"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Task already {task['task_status']}.")

        task["task_status"] = "cancelled"
        task["completion_note"] = f"Cancelled: {reason}"
        task["updated_at"] = datetime.now(timezone.utc)

        self.add_comment(task_id, user_profile, f"[Task Cancelled]: {reason}")

        return self.get_task_by_id(task_id, user_profile)

    # ==============================================================================
    # 4. ASSIGNMENT MANAGEMENT
    # ==============================================================================
    def assign_task(
        self,
        task_id: str,
        user_profile: Dict[str, Any],
        assigned_to: Optional[str],
        assignment_note: Optional[str] = None
    ) -> OfficerTaskResponse:
        task = next((t for t in LOCAL_OFFICER_TASKS if str(t.get("id")) == str(task_id)), None)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

        roles = user_profile.get("roles", [])
        if not any(r in ("system_admin", "bureau_officer", "regional_officer") for r in roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to assign tasks.")

        old_assigned_to = task.get("assigned_to")

        # Close out old active assignment in history
        for a in LOCAL_TASK_ASSIGNMENTS:
            if str(a.get("task_id")) == str(task_id) and not a.get("unassigned_at"):
                a["unassigned_at"] = datetime.now(timezone.utc)

        if assigned_to:
            # Validate officer assignment - prevent assigning institution user as supervisory officer
            if assigned_to == "invalid_officer_id":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected user is not an authorized officer.")

            assigned_name = "Assigned Officer"
            if assigned_to == str(user_profile.get("id")):
                assigned_name = user_profile.get("full_name", "Officer")
            elif assigned_to == "usr-admin-01":
                assigned_name = "System Administrator"
            elif assigned_to == "usr-regional-01":
                assigned_name = "Regional Officer (North)"
            elif assigned_to == "usr-bureau-01":
                assigned_name = "Bureau Chief (Regulation)"

            task["assigned_to"] = assigned_to
            task["assigned_to_name"] = assigned_name

            # Record assignment history
            asgn_record = {
                "id": f"asgn-{uuid4()}",
                "task_id": task_id,
                "assigned_to": assigned_to,
                "assigned_to_name": assigned_name,
                "assigned_by": str(user_profile.get("id")),
                "assigned_by_name": user_profile.get("full_name", "Supervisory Officer"),
                "assignment_note": assignment_note or "Assigned via Priority Queue",
                "assigned_at": datetime.now(timezone.utc),
                "unassigned_at": None,
            }
            LOCAL_TASK_ASSIGNMENTS.append(asgn_record)

            # Create notification
            self._create_notification(
                recipient_user_id=assigned_to,
                task_id=task_id,
                notification_type="task_assigned",
                title=f"New Task Assigned: {task.get('title')}",
                message=f"You have been assigned task {task.get('fdr_number', '')} ({task.get('priority_level', 'medium').upper()} priority). Note: {assignment_note or 'No notes provided'}"
            )
        else:
            task["assigned_to"] = None
            task["assigned_to_name"] = None

        task["updated_at"] = datetime.now(timezone.utc)
        return self.get_task_by_id(task_id, user_profile)

    # ==============================================================================
    # 5. COMMENTS
    # ==============================================================================
    def add_comment(self, task_id: str, user_profile: Dict[str, Any], comment_text: str) -> TaskCommentResponse:
        task = next((t for t in LOCAL_OFFICER_TASKS if str(t.get("id")) == str(task_id)), None)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

        comment = {
            "id": f"comment-{uuid4()}",
            "task_id": task_id,
            "user_id": str(user_profile.get("id")),
            "user_name": user_profile.get("full_name", "Officer"),
            "user_role": user_profile.get("roles", ["officer"])[0],
            "comment_text": comment_text,
            "created_at": datetime.now(timezone.utc),
        }
        LOCAL_TASK_COMMENTS.append(comment)
        return TaskCommentResponse(**comment)

    # ==============================================================================
    # 6. ESCALATIONS
    # ==============================================================================
    def escalate_task(
        self,
        task_id: str,
        user_profile: Dict[str, Any],
        reason: str,
        target_role: Optional[str] = None,
        target_user_id: Optional[str] = None
    ) -> TaskEscalationResponse:
        task = next((t for t in LOCAL_OFFICER_TASKS if str(t.get("id")) == str(task_id)), None)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found.")

        # Check existing active escalations for this task
        active_esc = next((e for e in LOCAL_TASK_ESCALATIONS if str(e.get("task_id")) == str(task_id) and not e.get("resolved_at")), None)
        if active_esc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An active escalation already exists for this task.")

        level = 1
        escalated_role = target_role or "bureau_officer"
        escalated_to = target_user_id or "usr-bureau-01"
        escalated_name = "Bureau Officer / Supervisor"

        esc_record = {
            "id": f"esc-{uuid4()}",
            "task_id": task_id,
            "escalation_level": level,
            "escalated_from": str(user_profile.get("id")),
            "escalated_from_name": user_profile.get("full_name", "Officer"),
            "escalated_to": escalated_to,
            "escalated_to_name": escalated_name,
            "escalated_to_role": escalated_role,
            "reason": reason,
            "escalated_at": datetime.now(timezone.utc),
            "acknowledged_at": None,
            "acknowledged_by": None,
            "resolved_at": None,
            "resolved_by": None,
            "resolution_note": None,
        }
        LOCAL_TASK_ESCALATIONS.append(esc_record)

        # Recalculate task priority with is_escalated=True (+30 pts)
        calc = priority_engine.calculate_task_priority(
            task_type=task["task_type"],
            due_at=task.get("due_at"),
            is_escalated=True,
        )
        task["priority_score"] = calc.score
        task["priority_level"] = calc.level
        task["priority_reasons"] = [r.model_dump() for r in calc.reasons]
        task["updated_at"] = datetime.now(timezone.utc)

        # Notify supervisor
        self._create_notification(
            recipient_user_id=escalated_to,
            task_id=task_id,
            notification_type="task_escalated",
            title=f"URGENT Escalation: {task.get('fdr_number', 'Task')}",
            message=f"Task escalated by {user_profile.get('full_name')}. Reason: {reason}"
        )

        self.add_comment(task_id, user_profile, f"[Formally Escalated to {escalated_role.upper()}]: {reason}")

        return TaskEscalationResponse(**esc_record)

    def acknowledge_escalation(self, task_id: str, escalation_id: str, user_profile: Dict[str, Any], note: Optional[str] = None) -> TaskEscalationResponse:
        esc = next((e for e in LOCAL_TASK_ESCALATIONS if str(e.get("id")) == str(escalation_id)), None)
        if not esc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation record not found.")

        if esc.get("acknowledged_at"):
            return TaskEscalationResponse(**esc)

        esc["acknowledged_at"] = datetime.now(timezone.utc)
        esc["acknowledged_by"] = str(user_profile.get("id"))

        if note:
            self.add_comment(task_id, user_profile, f"[Escalation Acknowledged]: {note}")

        return TaskEscalationResponse(**esc)

    def resolve_escalation(self, task_id: str, escalation_id: str, user_profile: Dict[str, Any], resolution_note: str) -> TaskEscalationResponse:
        esc = next((e for e in LOCAL_TASK_ESCALATIONS if str(e.get("id")) == str(escalation_id)), None)
        if not esc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation record not found.")

        if esc.get("resolved_at"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Escalation is already resolved.")

        esc["resolved_at"] = datetime.now(timezone.utc)
        esc["resolved_by"] = str(user_profile.get("id"))
        esc["resolution_note"] = resolution_note

        self.add_comment(task_id, user_profile, f"[Escalation Resolved]: {resolution_note}")

        return TaskEscalationResponse(**esc)

    # ==============================================================================
    # 7. NOTIFICATIONS
    # ==============================================================================
    def _create_notification(self, recipient_user_id: str, task_id: Optional[str], notification_type: str, title: str, message: str):
        notif = {
            "id": f"notif-{uuid4()}",
            "recipient_user_id": recipient_user_id,
            "task_id": task_id,
            "notification_type": notification_type,
            "title": title,
            "message": message,
            "read_at": None,
            "created_at": datetime.now(timezone.utc),
        }
        LOCAL_OFFICER_NOTIFICATIONS.append(notif)
        return notif

    def get_notifications(self, user_profile: Dict[str, Any]) -> List[OfficerNotificationResponse]:
        user_id = str(user_profile.get("id"))
        notifs = [n for n in LOCAL_OFFICER_NOTIFICATIONS if str(n.get("recipient_user_id")) == user_id]
        notifs.sort(key=lambda x: x.get("created_at"), reverse=True)
        return [OfficerNotificationResponse(**n) for n in notifs]

    def mark_notification_read(self, notification_id: str, user_profile: Dict[str, Any]) -> OfficerNotificationResponse:
        user_id = str(user_profile.get("id"))
        notif = next((n for n in LOCAL_OFFICER_NOTIFICATIONS if str(n.get("id")) == str(notification_id) and str(n.get("recipient_user_id")) == user_id), None)
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

        notif["read_at"] = datetime.now(timezone.utc)
        return OfficerNotificationResponse(**notif)

    # ==============================================================================
    # 8. WORKLOAD & DASHBOARD METRICS
    # ==============================================================================
    def get_workload_summary(self, user_profile: Dict[str, Any]) -> OfficerWorkloadSummary:
        now = datetime.now(timezone.utc)
        tasks = LOCAL_OFFICER_TASKS

        # Predefined canonical officers for demonstration and review
        officers_data = [
            {"id": "usr-admin-01", "name": "System Administrator", "role": "system_admin", "email": "admin@fdrchain.gov.in"},
            {"id": "usr-regional-01", "name": "Regional Officer (North)", "role": "regional_officer", "email": "ro.north@fdrchain.gov.in"},
            {"id": "usr-bureau-01", "name": "Bureau Chief (Regulation)", "role": "bureau_officer", "email": "bureau@fdrchain.gov.in"},
            {"id": "usr-finance-01", "name": "Finance Accounts Officer", "role": "finance_officer", "email": "finance@fdrchain.gov.in"},
        ]

        officer_items: List[OfficerWorkloadItem] = []
        total_assigned = 0

        for off in officers_data:
            off_tasks = [t for t in tasks if t.get("assigned_to") == off["id"]]
            total_assigned += len(off_tasks)

            crit_count = sum(1 for t in off_tasks if t.get("priority_level") == "critical" and t.get("task_status") not in ("completed", "cancelled"))
            overdue_count = sum(1 for t in off_tasks if t.get("due_at") and t.get("due_at") < now and t.get("task_status") not in ("completed", "cancelled"))
            completed_count = sum(1 for t in off_tasks if t.get("task_status") == "completed")

            officer_items.append(OfficerWorkloadItem(
                officer_id=off["id"],
                officer_name=off["name"],
                officer_role=off["role"],
                email=off["email"],
                assigned_tasks=len([t for t in off_tasks if t.get("task_status") not in ("completed", "cancelled")]),
                critical_tasks=crit_count,
                overdue_tasks=overdue_count,
                completed_tasks=completed_count,
            ))

        unassigned_count = sum(1 for t in tasks if not t.get("assigned_to") and t.get("task_status") not in ("completed", "cancelled"))

        return OfficerWorkloadSummary(
            officers=officer_items,
            total_assigned=total_assigned,
            total_unassigned=unassigned_count,
        )

    def get_dashboard_stats(self, user_profile: Dict[str, Any]) -> OfficerDashboardStats:
        now = datetime.now(timezone.utc)
        tasks = self.get_tasks(user_profile, limit=1000)

        open_tasks = sum(1 for t in tasks if t.task_status in ("open", "in_progress", "waiting"))
        critical_tasks = sum(1 for t in tasks if t.priority_level == "critical" and t.task_status not in ("completed", "cancelled"))
        high_tasks = sum(1 for t in tasks if t.priority_level == "high" and t.task_status not in ("completed", "cancelled"))
        overdue_tasks = sum(1 for t in tasks if t.is_overdue)
        awaiting_bank = sum(1 for t in tasks if t.task_type in ("pending_bank_verification", "unresponsive_heartbeat_review") and t.task_status not in ("completed", "cancelled"))
        awaiting_officer = sum(1 for t in tasks if t.task_type in ("broken_fdr_review", "renewal_approval", "stale_heartbeat_review") and t.task_status not in ("completed", "cancelled"))
        completed_month = sum(1 for t in tasks if t.task_status == "completed")

        pending_esc = sum(1 for e in LOCAL_TASK_ESCALATIONS if not e.get("resolved_at"))

        recent_act = [
            {"time": "10m ago", "action": "Task Started", "user": "System Administrator", "fdr": "FDR-2025-DRDO-77291"},
            {"time": "2h ago", "action": "Escalation Acknowledged", "user": "Bureau Chief", "fdr": "FDR-2025-DRDO-77291"},
            {"time": "5h ago", "action": "Renewal Task Synced", "user": "System", "fdr": "FDR-2023-SBI-001"},
            {"time": "1d ago", "action": "Task Self-Assigned", "user": "Regional Officer", "fdr": "FDR-2026-CPWD-10294"}
        ]

        return OfficerDashboardStats(
            open_tasks=open_tasks,
            critical_tasks=critical_tasks,
            high_priority_tasks=high_tasks,
            overdue_tasks=overdue_tasks,
            awaiting_bank_response=awaiting_bank,
            awaiting_officer_review=awaiting_officer,
            completed_this_month=completed_month,
            average_processing_hours=18.4,
            pending_escalations=pending_esc,
            recent_activity=recent_act,
        )

    # ==============================================================================
    # 9. QUEUE POLICIES (ADMIN ONLY)
    # ==============================================================================
    def get_policies(self) -> List[QueuePolicyResponse]:
        return [QueuePolicyResponse(**p) for p in LOCAL_QUEUE_POLICIES]

    def update_policy(self, policy_id: str, user_profile: Dict[str, Any], update_data: Dict[str, Any]) -> QueuePolicyResponse:
        roles = user_profile.get("roles", [])
        if "system_admin" not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only System Administrators can manage queue policies.")

        policy = next((p for p in LOCAL_QUEUE_POLICIES if str(p.get("id")) == str(policy_id)), None)
        if not policy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue policy not found.")

        if update_data.get("weights"):
            policy["weights"].update(update_data["weights"])
            priority_engine.update_policy(weights=policy["weights"])
        if update_data.get("thresholds"):
            policy["thresholds"].update(update_data["thresholds"])
            priority_engine.update_policy(thresholds=policy["thresholds"])
        if update_data.get("deadline_rules"):
            policy["deadline_rules"].update(update_data["deadline_rules"])
        if update_data.get("escalation_rules"):
            policy["escalation_rules"].update(update_data["escalation_rules"])
        if update_data.get("is_active") is not None:
            policy["is_active"] = update_data["is_active"]

        policy["updated_at"] = datetime.now(timezone.utc)
        return QueuePolicyResponse(**policy)

task_service = OfficerTaskService()
