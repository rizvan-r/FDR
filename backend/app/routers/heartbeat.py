import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.dependencies import get_current_user, require_admin, require_roles
from app.services.heartbeat_service import heartbeat_service
from app.services.fdr_service import fdr_service
from app.schemas.heartbeat import (
    HeartbeatPolicyCreate,
    HeartbeatPolicyUpdate,
    HeartbeatPolicyResponse,
    HeartbeatCheckRequest,
    HeartbeatCheckResponse,
    FDRAlertResponse,
    AlertAssignRequest,
    AlertResolveRequest,
    HeartbeatDashboardStats,
)

logger = logging.getLogger("fdr_chain.routers.heartbeat")

router = APIRouter(tags=["Heartbeat Monitoring & Regulatory Alerts"])

# ==============================================================================
# 1. MONITORING DASHBOARD & FDR REPOSITORIES
# ==============================================================================

@router.get("/heartbeat/dashboard", response_model=HeartbeatDashboardStats)
async def get_heartbeat_dashboard(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Returns aggregated real-time monitoring and heartbeat compliance statistics."""
    return heartbeat_service.get_dashboard_stats(current_user)

@router.get("/heartbeat/fdrs")
async def get_monitored_fdrs(
    search: Optional[str] = Query(None, description="Search by FDR number, institution or bank"),
    heartbeat_status: Optional[str] = Query(None, description="Filter by status: alive, stale, broken, unresponsive, not_started"),
    bank_id: Optional[str] = Query(None),
    institution_id: Optional[str] = Query(None),
    trust_tier: Optional[int] = Query(None),
    region_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Lists monitored FDRs with their heartbeat standing, freshness metrics and maturity dates."""
    res = fdr_service.get_fdrs(
        current_user=current_user,
        search=search,
        bank_id=bank_id,
        institution_id=institution_id,
        trust_tier=trust_tier,
        region_id=region_id,
        page=page,
        page_size=page_size,
    )

    items = res.get("items", [])
    if heartbeat_status:
        items = [f for f in items if f.get("heartbeat_status") == heartbeat_status]

    # Decorate with applicable policy intervals
    decorated = []
    for f in items:
        policy = heartbeat_service.get_applicable_policy(f)
        decorated.append({
            **f,
            "applicable_policy_name": policy.get("name"),
            "heartbeat_interval_days": policy.get("heartbeat_interval_days"),
            "stale_after_days": policy.get("stale_after_days"),
        })

    return {
        "items": decorated,
        "total": len(decorated) if heartbeat_status else res.get("total", len(items)),
        "page": page,
        "page_size": page_size,
        "total_pages": res.get("total_pages", 1),
    }

@router.get("/fdrs/{fdr_id}/heartbeat")
async def get_fdr_heartbeat_status(
    fdr_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Fetches real-time heartbeat parameters, policy, and active check for a single FDR."""
    fdr = fdr_service.get_fdr_by_id(fdr_id)
    policy = heartbeat_service.get_applicable_policy(fdr)
    active_check = heartbeat_service.get_active_check_for_fdr(fdr_id)
    history = heartbeat_service.get_fdr_checks(fdr_id)

    return {
        "fdr_id": str(fdr["id"]),
        "fdr_number": fdr.get("fdr_number"),
        "heartbeat_status": fdr.get("heartbeat_status", "not_started"),
        "last_heartbeat_at": fdr.get("last_heartbeat_at"),
        "next_heartbeat_at": fdr.get("next_heartbeat_at"),
        "heartbeat_failure_count": fdr.get("heartbeat_failure_count", 0),
        "policy": policy,
        "active_check": active_check,
        "total_checks_count": len(history),
    }

@router.get("/fdrs/{fdr_id}/heartbeat/history", response_model=List[HeartbeatCheckResponse])
async def get_fdr_heartbeat_history(
    fdr_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Returns the immutable append-only historical ledger of heartbeat checks for an FDR."""
    # Validate existence
    fdr_service.get_fdr_by_id(fdr_id)
    return heartbeat_service.get_fdr_checks(fdr_id)

# ==============================================================================
# 2. MANUAL HEARTBEAT CHECK TRIGGER
# ==============================================================================

@router.post(
    "/fdrs/{fdr_id}/heartbeat/request",
    response_model=HeartbeatCheckResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(["system_admin", "bureau_officer", "finance_officer", "regional_officer"]))]
)
async def request_manual_heartbeat_check(
    fdr_id: str,
    req: HeartbeatCheckRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Authorized officer triggers an ad-hoc heartbeat check.
    Enforces check uniqueness (prevents duplicate active checks).
    """
    return heartbeat_service.create_heartbeat_check(
        fdr_id=fdr_id,
        verification_method=req.verification_method or "tier2_bank_confirmation",
        notes=req.notes,
        actor_profile=current_user,
        is_manual=True,
    )

# ==============================================================================
# 3. HEARTBEAT POLICY ADMINISTRATION (SYSTEM ADMIN ONLY)
# ==============================================================================

@router.get("/admin/heartbeat-policies", response_model=List[HeartbeatPolicyResponse])
async def list_heartbeat_policies(
    active_only: bool = Query(False),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Returns all configured heartbeat policies."""
    return heartbeat_service.get_policies(active_only=active_only)

@router.post(
    "/admin/heartbeat-policies",
    response_model=HeartbeatPolicyResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)]
)
async def create_heartbeat_policy(
    policy_data: HeartbeatPolicyCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """System Administrator creates a new heartbeat policy."""
    return heartbeat_service.create_policy(policy_data.model_dump(), current_user)

@router.patch(
    "/admin/heartbeat-policies/{policy_id}",
    response_model=HeartbeatPolicyResponse,
    dependencies=[Depends(require_admin)]
)
@router.put(
    "/admin/heartbeat-policies/{policy_id}",
    response_model=HeartbeatPolicyResponse,
    dependencies=[Depends(require_admin)]
)
async def update_heartbeat_policy(
    policy_id: str,
    policy_data: HeartbeatPolicyUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """System Administrator updates an existing heartbeat policy."""
    return heartbeat_service.update_policy(policy_id, policy_data.model_dump(exclude_unset=True), current_user)

# ==============================================================================
# 4. OFFICER REGULATORY ALERTS DESK
# ==============================================================================

@router.get("/alerts")
async def list_regulatory_alerts(
    fdr_id: Optional[str] = Query(None, description="Filter by FDR ID"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolution standing"),
    alert_type: Optional[str] = Query(None, description="Filter by alert type"),
    severity: Optional[str] = Query(None, description="Filter by severity: low, medium, high, critical"),
    search: Optional[str] = Query(None, description="Search alert title or description"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Returns paginated regulatory alerts scoped to the current user's role and jurisdiction."""
    return heartbeat_service.get_alerts(
        current_user=current_user,
        fdr_id=fdr_id,
        is_resolved=is_resolved,
        alert_type=alert_type,
        severity=severity,
        search=search,
        page=page,
        page_size=page_size,
    )

@router.patch("/alerts/{alert_id}/read", response_model=FDRAlertResponse)
async def mark_alert_as_read(
    alert_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Officer marks an alert as read."""
    return heartbeat_service.mark_alert_read(alert_id, current_user)

@router.patch(
    "/alerts/{alert_id}/assign",
    response_model=FDRAlertResponse,
    dependencies=[Depends(require_roles(["system_admin", "bureau_officer", "finance_officer", "regional_officer"]))]
)
async def assign_alert_to_officer(
    alert_id: str,
    assign_req: AlertAssignRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Assigns an alert to a compliance officer."""
    assignee = assign_req.assigned_to or assign_req.user_id
    return heartbeat_service.assign_alert(alert_id, str(assignee), current_user)

@router.patch(
    "/alerts/{alert_id}/resolve",
    response_model=FDRAlertResponse,
    dependencies=[Depends(require_roles(["system_admin", "bureau_officer", "finance_officer", "regional_officer"]))]
)
async def resolve_regulatory_alert(
    alert_id: str,
    resolve_req: AlertResolveRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Resolves an active alert with documented audit note.
    If resolving a broken heartbeat alert, authorizes clearing the Broken standing for re-attestation.
    """
    note = resolve_req.resolution_note or resolve_req.resolution_notes or "Resolved by officer"
    return heartbeat_service.resolve_alert(alert_id, note, current_user)

# ==============================================================================
# 5. SCHEDULER CYCLE TRIGGER (FOR TESTING & IMMEDIATE SYNCHRONIZATION)
# ==============================================================================

@router.post(
    "/heartbeat/run-scheduler-cycle",
    dependencies=[Depends(require_roles(["system_admin", "bureau_officer"]))]
)
@router.post(
    "/heartbeat/scheduler/run-cycle",
    dependencies=[Depends(require_roles(["system_admin", "bureau_officer"]))]
)
async def trigger_scheduler_cycle(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Triggers an immediate idempotent scheduler run (freshness evaluation, timeout handling,
    due checks dispatch, and maturity warnings).
    """
    cycle_stats = heartbeat_service.run_full_scheduler_cycle()
    return {
        "status": "success",
        "message": "Full surveillance cycle executed successfully.",
        "cycle_stats": cycle_stats,
    }
