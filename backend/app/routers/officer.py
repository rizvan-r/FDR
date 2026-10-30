import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, Body, status
from app.auth.dependencies import get_current_user, require_admin
from app.services.task_service import task_service
from app.schemas.officer import (
    OfficerTaskResponse, OfficerTaskDetailResponse,
    TaskAssignRequest, TaskStartRequest, TaskWaitRequest, TaskCompleteRequest, TaskCancelRequest,
    TaskCommentCreateRequest, TaskCommentResponse,
    TaskEscalateRequest, TaskEscalationResponse, TaskEscalationAcknowledgeRequest, TaskEscalationResolveRequest,
    OfficerNotificationResponse, QueuePolicyResponse, QueuePolicyUpdateRequest,
    OfficerDashboardStats, OfficerWorkloadSummary
)

logger = logging.getLogger("fdr_chain.officer_router")
router = APIRouter(prefix="/officer", tags=["Officer Workspace & Priority Queue"])

# ==============================================================================
# 1. OFFICER DASHBOARD
# ==============================================================================
@router.get("/dashboard", response_model=OfficerDashboardStats)
async def get_officer_dashboard_stats(current_user: dict = Depends(get_current_user)):
    return task_service.get_dashboard_stats(current_user)

# ==============================================================================
# 2. TASK SYNCHRONIZATION
# ==============================================================================
@router.post("/tasks/sync")
async def trigger_task_synchronization(current_user: dict = Depends(get_current_user)):
    return task_service.sync_tasks_from_sources()

# ==============================================================================
# 3. TASK QUERY & RETRIEVAL
# ==============================================================================
@router.get("/tasks", response_model=List[OfficerTaskResponse])
async def list_officer_tasks(
    status: Optional[str] = Query(None, description="Filter by status (open, in_progress, waiting, completed, cancelled)"),
    priority_level: Optional[str] = Query(None, description="Filter by priority level (critical, high, medium, low)"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned user ID"),
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    search: Optional[str] = Query(None, description="Search term for title, fdr number, or institution"),
    my_tasks: Optional[bool] = Query(False, description="Filter tasks assigned to the calling user"),
    unassigned_only: Optional[bool] = Query(False, description="Filter for unassigned tasks"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    return task_service.get_tasks(
        user_profile=current_user,
        task_status=status,
        priority_level=priority_level,
        assigned_to=assigned_to,
        task_type=task_type,
        search=search,
        my_tasks=my_tasks,
        unassigned_only=unassigned_only,
        limit=limit,
        offset=offset
    )

@router.get("/tasks/{id}", response_model=OfficerTaskDetailResponse)
async def get_officer_task_detail(
    id: str = Path(..., description="Task ID"),
    current_user: dict = Depends(get_current_user)
):
    return task_service.get_task_by_id(id, current_user)

@router.get("/tasks/{id}/history")
async def get_officer_task_history(
    id: str = Path(..., description="Task ID"),
    current_user: dict = Depends(get_current_user)
):
    detail = task_service.get_task_by_id(id, current_user)
    return {
        "task_id": id,
        "assignments": detail.assignments,
        "comments": detail.comments,
        "escalations": detail.escalations,
    }

# ==============================================================================
# 4. TASK LIFECYCLE ACTIONS
# ==============================================================================
@router.post("/tasks/{id}/start", response_model=OfficerTaskResponse)
async def start_officer_task(
    id: str = Path(..., description="Task ID"),
    body: TaskStartRequest = Body(default_factory=TaskStartRequest),
    current_user: dict = Depends(get_current_user)
):
    return task_service.start_task(id, current_user, note=body.note)

@router.post("/tasks/{id}/wait", response_model=OfficerTaskResponse)
async def wait_officer_task(
    id: str = Path(..., description="Task ID"),
    body: TaskWaitRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    return task_service.wait_task(id, current_user, reason=body.reason)

@router.post("/tasks/{id}/complete", response_model=OfficerTaskResponse)
async def complete_officer_task(
    id: str = Path(..., description="Task ID"),
    body: TaskCompleteRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    return task_service.complete_task(id, current_user, completion_note=body.completion_note)

@router.post("/tasks/{id}/cancel", response_model=OfficerTaskResponse)
async def cancel_officer_task(
    id: str = Path(..., description="Task ID"),
    body: TaskCancelRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    return task_service.cancel_task(id, current_user, reason=body.reason)

# ==============================================================================
# 5. ASSIGNMENT & DELEGATION
# ==============================================================================
@router.post("/tasks/{id}/assign", response_model=OfficerTaskResponse)
async def assign_officer_task(
    id: str = Path(..., description="Task ID"),
    body: TaskAssignRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    return task_service.assign_task(
        task_id=id,
        user_profile=current_user,
        assigned_to=body.assigned_to,
        assignment_note=body.assignment_note
    )

# ==============================================================================
# 6. COMMENTS
# ==============================================================================
@router.post("/tasks/{id}/comments", response_model=TaskCommentResponse)
async def add_officer_task_comment(
    id: str = Path(..., description="Task ID"),
    body: TaskCommentCreateRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    return task_service.add_comment(
        task_id=id,
        user_profile=current_user,
        comment_text=body.comment_text
    )

# ==============================================================================
# 7. ESCALATIONS
# ==============================================================================
@router.post("/tasks/{id}/escalate", response_model=TaskEscalationResponse)
async def escalate_officer_task(
    id: str = Path(..., description="Task ID"),
    body: TaskEscalateRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    return task_service.escalate_task(
        task_id=id,
        user_profile=current_user,
        reason=body.reason,
        target_role=body.target_role,
        target_user_id=body.target_user_id
    )

@router.post("/tasks/{id}/escalations/{esc_id}/acknowledge", response_model=TaskEscalationResponse)
async def acknowledge_task_escalation(
    id: str = Path(..., description="Task ID"),
    esc_id: str = Path(..., description="Escalation ID"),
    body: TaskEscalationAcknowledgeRequest = Body(default_factory=TaskEscalationAcknowledgeRequest),
    current_user: dict = Depends(get_current_user)
):
    return task_service.acknowledge_escalation(id, esc_id, current_user, note=body.note)

@router.post("/tasks/{id}/escalations/{esc_id}/resolve", response_model=TaskEscalationResponse)
async def resolve_task_escalation(
    id: str = Path(..., description="Task ID"),
    esc_id: str = Path(..., description="Escalation ID"),
    body: TaskEscalationResolveRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    return task_service.resolve_escalation(id, esc_id, current_user, resolution_note=body.resolution_note)

# ==============================================================================
# 8. WORKLOAD SUMMARY
# ==============================================================================
@router.get("/workload", response_model=OfficerWorkloadSummary)
async def get_officer_workload_summary(current_user: dict = Depends(get_current_user)):
    return task_service.get_workload_summary(current_user)

# ==============================================================================
# 9. NOTIFICATIONS
# ==============================================================================
@router.get("/notifications", response_model=List[OfficerNotificationResponse])
async def list_officer_notifications(current_user: dict = Depends(get_current_user)):
    return task_service.get_notifications(current_user)

@router.patch("/notifications/{id}/read", response_model=OfficerNotificationResponse)
async def mark_notification_as_read(
    id: str = Path(..., description="Notification ID"),
    current_user: dict = Depends(get_current_user)
):
    return task_service.mark_notification_read(id, current_user)

# ==============================================================================
# 10. QUEUE POLICIES (ADMINISTRATOR ONLY)
# ==============================================================================
@router.get("/policies", response_model=List[QueuePolicyResponse])
async def get_queue_policies(current_user: dict = Depends(get_current_user)):
    return task_service.get_policies()

@router.put("/policies/{id}", response_model=QueuePolicyResponse)
async def update_queue_policy(
    id: str = Path(..., description="Policy ID"),
    body: QueuePolicyUpdateRequest = Body(...),
    current_user: dict = Depends(require_admin)
):
    return task_service.update_policy(id, current_user, body.model_dump(exclude_unset=True))
