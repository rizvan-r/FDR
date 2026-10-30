import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.schemas.officer import PriorityReason, PriorityCalculationResult, TaskPriorityLevel

logger = logging.getLogger("fdr_chain.priority_service")

# ==============================================================================
# DEFAULT WEIGHTS & THRESHOLDS (Configurable via Queue Policy)
# ==============================================================================

DEFAULT_PRIORITY_WEIGHTS: Dict[str, int] = {
    "broken_fdr": 100,
    "unresponsive_heartbeat": 70,
    "stale_heartbeat": 40,
    "deadline_exceeded": 50,
    "deadline_within_24h": 35,
    "deadline_within_7d": 20,
    "renewal_awaiting_review": 20,
    "missing_evidence": 15,
    "escalated_case": 30,
}

DEFAULT_PRIORITY_THRESHOLDS: Dict[str, int] = {
    "critical": 100,
    "high": 70,
    "medium": 35,
    "low": 0,
}

class PriorityEngineService:
    def __init__(self):
        self.weights = DEFAULT_PRIORITY_WEIGHTS.copy()
        self.thresholds = DEFAULT_PRIORITY_THRESHOLDS.copy()

    def update_policy(self, weights: Optional[Dict[str, int]] = None, thresholds: Optional[Dict[str, int]] = None):
        if weights:
            self.weights.update(weights)
        if thresholds:
            self.thresholds.update(thresholds)

    def calculate_task_priority(
        self,
        task_type: str,
        due_at: Optional[datetime] = None,
        is_escalated: bool = False,
        missing_evidence: bool = False,
        custom_weights: Optional[Dict[str, int]] = None,
        custom_thresholds: Optional[Dict[str, int]] = None,
    ) -> PriorityCalculationResult:
        weights = custom_weights or self.weights
        thresholds = custom_thresholds or self.thresholds

        score = 0
        reasons: List[PriorityReason] = []
        now = datetime.now(timezone.utc)

        # 1. Base Task Type Evaluation
        if task_type == "broken_fdr_review":
            pts = weights.get("broken_fdr", 100)
            score += pts
            reasons.append(PriorityReason(
                code="broken_fdr",
                points=pts,
                description="Lien discharged, bank decree, or broken deposit standing detected (+100)"
            ))
        elif task_type == "unresponsive_heartbeat_review":
            pts = weights.get("unresponsive_heartbeat", 70)
            score += pts
            reasons.append(PriorityReason(
                code="unresponsive_heartbeat",
                points=pts,
                description="Depository bank branch unresponsive to automated heartbeat attempts (+70)"
            ))
        elif task_type == "stale_heartbeat_review":
            pts = weights.get("stale_heartbeat", 40)
            score += pts
            reasons.append(PriorityReason(
                code="stale_heartbeat",
                points=pts,
                description="Heartbeat attestation window expired without fresh re-confirmation (+40)"
            ))
        elif task_type in ("renewal_approval", "pending_bank_verification"):
            pts = weights.get("renewal_awaiting_review", 20)
            score += pts
            reasons.append(PriorityReason(
                code="renewal_awaiting_review",
                points=pts,
                description="Deposit action submitted and pending officer review/verification (+20)"
            ))

        # 2. Deadline Urgency Evaluation
        if due_at:
            if due_at.tzinfo is None:
                due_at = due_at.replace(tzinfo=timezone.utc)

            time_left = due_at - now
            seconds_left = time_left.total_seconds()

            if seconds_left < 0:
                pts = weights.get("deadline_exceeded", 50)
                score += pts
                reasons.append(PriorityReason(
                    code="deadline_exceeded",
                    points=pts,
                    description=f"Action deadline overdue by {abs(int(seconds_left // 3600))} hours (+50)"
                ))
            elif seconds_left <= 86400:  # <= 24 hours
                pts = weights.get("deadline_within_24h", 35)
                score += pts
                reasons.append(PriorityReason(
                    code="deadline_within_24h",
                    points=pts,
                    description=f"Action deadline due within 24 hours ({int(seconds_left // 3600)}h remaining) (+35)"
                ))
            elif seconds_left <= 7 * 86400:  # <= 7 days
                pts = weights.get("deadline_within_7d", 20)
                score += pts
                reasons.append(PriorityReason(
                    code="deadline_within_7d",
                    points=pts,
                    description=f"Action deadline approaching within 7 days ({int(seconds_left // 86400)}d remaining) (+20)"
                ))

        # 3. Missing Evidence Evaluation
        if missing_evidence:
            pts = weights.get("missing_evidence", 15)
            score += pts
            reasons.append(PriorityReason(
                code="missing_evidence",
                points=pts,
                description="Mandatory documentation or bank verification evidence missing (+15)"
            ))

        # 4. Escalation Evaluation
        if is_escalated:
            pts = weights.get("escalated_case", 30)
            score += pts
            reasons.append(PriorityReason(
                code="escalated_case",
                points=pts,
                description="Case has been formally escalated to senior supervisory tier (+30)"
            ))

        # 5. Threshold Mapping
        crit_thresh = thresholds.get("critical", 100)
        high_thresh = thresholds.get("high", 70)
        med_thresh = thresholds.get("medium", 35)

        if score >= crit_thresh:
            level: TaskPriorityLevel = "critical"
        elif score >= high_thresh:
            level = "high"
        elif score >= med_thresh:
            level = "medium"
        else:
            level = "low"

        # 6. Human-readable explanation
        reasons_summary = ", ".join([r.code for r in reasons]) if reasons else "baseline task"
        explanation = f"Calculated composite score {score} points ({level.upper()}) based on {len(reasons)} active signal(s): [{reasons_summary}]."

        return PriorityCalculationResult(
            score=score,
            level=level,
            reasons=reasons,
            explanation=explanation,
        )

priority_engine = PriorityEngineService()
