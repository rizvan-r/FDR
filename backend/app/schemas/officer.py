from typing import List, Optional, Dict, Any, Literal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

TaskPriorityLevel = Literal['critical', 'high', 'medium', 'low']
TaskStatus = Literal['open', 'in_progress', 'waiting', 'completed', 'cancelled']
TaskType = Literal[
    'broken_fdr_review',
    'stale_heartbeat_review',
    'unresponsive_heartbeat_review',
    'pending_bank_verification',
    'overdue_verification',
    'renewal_approval',
    'renewal_evidence_review',
    'upcoming_maturity_follow_up',
    'escalation_acknowledgement'
]
TaskSourceType = Literal[
    'fdr_alert',
    'heartbeat_check',
    'verification_request',
    'renewal_case',
    'fdr',
    'escalation'
]

class PriorityReason(BaseModel):
    code: str
    points: int
    description: str

class PriorityCalculationResult(BaseModel):
    score: int
    level: TaskPriorityLevel
    reasons: List[PriorityReason]
    explanation: str

class TaskAssignmentResponse(BaseModel):
    id: str
    task_id: str
    assigned_to: str
    assigned_to_name: Optional[str] = None
    assigned_by: str
    assigned_by_name: Optional[str] = None
    assignment_note: Optional[str] = None
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None

class TaskCommentResponse(BaseModel):
    id: str
    task_id: str
    user_id: str
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    comment_text: str
    created_at: datetime

class TaskEscalationResponse(BaseModel):
    id: str
    task_id: str
    escalation_level: int
    escalated_from: Optional[str] = None
    escalated_from_name: Optional[str] = None
    escalated_to: Optional[str] = None
    escalated_to_name: Optional[str] = None
    escalated_to_role: Optional[str] = None
    reason: str
    escalated_at: datetime
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None

class OfficerTaskResponse(BaseModel):
    id: str
    task_type: TaskType
    source_type: TaskSourceType
    source_id: str
    fdr_id: Optional[str] = None
    fdr_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None
    region_id: Optional[str] = None
    region_name: Optional[str] = None
    bank_id: Optional[str] = None
    bank_name: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by: Optional[str] = None
    priority_score: int
    priority_level: TaskPriorityLevel
    priority_reasons: List[PriorityReason] = []
    task_status: TaskStatus
    due_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completion_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    task_age_hours: Optional[float] = None
    is_overdue: Optional[bool] = False
    is_escalated: Optional[bool] = False

class OfficerTaskDetailResponse(OfficerTaskResponse):
    assignments: List[TaskAssignmentResponse] = []
    comments: List[TaskCommentResponse] = []
    escalations: List[TaskEscalationResponse] = []
    source_data: Optional[Dict[str, Any]] = None
    fdr_summary: Optional[Dict[str, Any]] = None

class TaskAssignRequest(BaseModel):
    assigned_to: Optional[str] = Field(None, description="User ID to assign to. Null for unassignment.")
    assignment_note: Optional[str] = Field(None, max_length=500)

class TaskStartRequest(BaseModel):
    note: Optional[str] = None

class TaskWaitRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)

class TaskCompleteRequest(BaseModel):
    completion_note: str = Field(..., min_length=5, max_length=1000)

class TaskCancelRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000)

class TaskCommentCreateRequest(BaseModel):
    comment_text: str = Field(..., min_length=1, max_length=2000)

class TaskEscalateRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000)
    target_role: Optional[str] = None
    target_user_id: Optional[str] = None

class TaskEscalationAcknowledgeRequest(BaseModel):
    note: Optional[str] = None

class TaskEscalationResolveRequest(BaseModel):
    resolution_note: str = Field(..., min_length=5, max_length=1000)

class OfficerNotificationResponse(BaseModel):
    id: str
    recipient_user_id: str
    task_id: Optional[str] = None
    notification_type: str
    title: str
    message: str
    read_at: Optional[datetime] = None
    created_at: datetime

class QueuePolicyResponse(BaseModel):
    id: str
    name: str
    is_active: bool
    is_default: bool
    weights: Dict[str, int]
    thresholds: Dict[str, int]
    deadline_rules: Dict[str, Any]
    escalation_rules: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class QueuePolicyUpdateRequest(BaseModel):
    name: Optional[str] = None
    weights: Optional[Dict[str, int]] = None
    thresholds: Optional[Dict[str, int]] = None
    deadline_rules: Optional[Dict[str, Any]] = None
    escalation_rules: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class OfficerDashboardStats(BaseModel):
    open_tasks: int
    critical_tasks: int
    high_priority_tasks: int
    overdue_tasks: int
    awaiting_bank_response: int
    awaiting_officer_review: int
    completed_this_month: int
    average_processing_hours: float
    pending_escalations: int
    recent_activity: List[Dict[str, Any]] = []

class OfficerWorkloadItem(BaseModel):
    officer_id: str
    officer_name: str
    officer_role: str
    email: str
    assigned_tasks: int
    critical_tasks: int
    overdue_tasks: int
    completed_tasks: int

class OfficerWorkloadSummary(BaseModel):
    officers: List[OfficerWorkloadItem]
    total_assigned: int
    total_unassigned: int
