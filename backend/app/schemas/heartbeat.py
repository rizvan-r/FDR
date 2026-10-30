from typing import Optional, List, Dict, Any, Literal, Union
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
from uuid import UUID

IdType = Union[UUID, str]

# ==============================================================================
# 1. HEARTBEAT POLICY SCHEMAS
# ==============================================================================

class HeartbeatPolicyBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None
    heartbeat_interval_days: int = Field(30, gt=0, description="Scheduled cadence between checks in days")
    frequency_days: Optional[int] = Field(None, description="Alias for heartbeat_interval_days")
    stale_after_days: int = Field(45, gt=0, description="Days without verified attestation before marked Stale")
    stale_threshold_days: Optional[int] = Field(None, description="Alias for stale_after_days")
    response_timeout_hours: int = Field(48, gt=0, description="Window for bank officer response in hours")
    max_retries: int = Field(3, ge=0, description="Maximum retry attempts before marked Unresponsive")
    retry_interval_hours: int = Field(24, gt=0, description="Hours between retry attempts")
    maturity_alert_days: List[int] = Field(
        default=[90, 60, 30, 7, 1, 0],
        description="Threshold days before maturity to issue regulatory warnings"
    )
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    is_active: bool = True
    is_default: bool = False
    institution_id: Optional[IdType] = None
    bank_id: Optional[IdType] = None

    @field_validator("stale_after_days")
    @classmethod
    def validate_stale_cadence(cls, v, info):
        interval = info.data.get("heartbeat_interval_days")
        if interval is not None and v < interval:
            raise ValueError("stale_after_days must be greater than or equal to heartbeat_interval_days")
        return v

class HeartbeatPolicyCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None
    heartbeat_interval_days: Optional[int] = Field(None, gt=0)
    frequency_days: Optional[int] = Field(None, gt=0)
    stale_after_days: Optional[int] = Field(None, gt=0)
    stale_threshold_days: Optional[int] = Field(None, gt=0)
    response_timeout_hours: int = Field(48, gt=0)
    max_retries: int = Field(3, ge=0)
    retry_interval_hours: int = Field(24, gt=0)
    maturity_alert_days: Optional[List[int]] = Field(default=[90, 60, 30, 7, 1, 0])
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    is_active: bool = True
    is_default: bool = False
    institution_id: Optional[IdType] = None
    bank_id: Optional[IdType] = None

class HeartbeatPolicyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = None
    heartbeat_interval_days: Optional[int] = Field(None, gt=0)
    frequency_days: Optional[int] = Field(None, gt=0)
    stale_after_days: Optional[int] = Field(None, gt=0)
    stale_threshold_days: Optional[int] = Field(None, gt=0)
    response_timeout_hours: Optional[int] = Field(None, gt=0)
    max_retries: Optional[int] = Field(None, ge=0)
    retry_interval_hours: Optional[int] = Field(None, gt=0)
    maturity_alert_days: Optional[List[int]] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    institution_id: Optional[IdType] = None
    bank_id: Optional[IdType] = None

class HeartbeatPolicyResponse(HeartbeatPolicyBase):
    id: IdType
    frequency_days: Optional[int] = None
    stale_threshold_days: Optional[int] = None
    created_by: Optional[IdType] = None
    created_at: datetime
    updated_at: datetime


# ==============================================================================
# 2. HEARTBEAT CHECK SCHEMAS
# ==============================================================================

CheckStatusType = Literal['scheduled', 'requested', 'confirmed', 'rejected', 'timed_out', 'cancelled']
VerificationMethodType = Literal['tier2_bank_confirmation', 'tier3_digital_signature']

class HeartbeatCheckRequest(BaseModel):
    verification_method: Optional[VerificationMethodType] = 'tier2_bank_confirmation'
    notes: Optional[str] = Field(None, description="Optional justification or reference notes for manual check")

class HeartbeatCheckResponse(BaseModel):
    id: IdType
    fdr_id: IdType
    fdr_number: Optional[str] = None
    bank_id: IdType
    bank_name: Optional[str] = None
    institution_id: Optional[IdType] = None
    institution_name: Optional[str] = None
    check_number: int
    check_status: CheckStatusType
    verification_method: VerificationMethodType
    requested_at: datetime
    response_due_at: datetime
    completed_at: Optional[datetime] = None
    retry_count: int = 0
    notes: Optional[str] = None
    request_snapshot: Dict[str, Any] = Field(default_factory=dict)
    attestation_id: Optional[IdType] = None
    verification_request_id: Optional[IdType] = None
    raw_token: Optional[str] = None
    verification_url: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ==============================================================================
# 3. FDR REGULATORY ALERT SCHEMAS
# ==============================================================================

AlertType = str
SeverityType = str

class FDRAlertResponse(BaseModel):
    id: IdType
    fdr_id: IdType
    fdr_number: Optional[str] = None
    institution_id: Optional[IdType] = None
    institution_name: Optional[str] = None
    alert_type: AlertType
    severity: SeverityType
    title: str
    description: Optional[str] = None
    message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    due_at: Optional[datetime] = None
    is_read: bool = False
    is_resolved: bool = False
    assigned_to: Optional[IdType] = None
    assigned_to_name: Optional[str] = None
    resolution_note: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class AlertAssignRequest(BaseModel):
    assigned_to: Optional[IdType] = None
    user_id: Optional[IdType] = None

class AlertResolveRequest(BaseModel):
    resolution_note: Optional[str] = None
    resolution_notes: Optional[str] = None


# ==============================================================================
# 4. DASHBOARD & MONITORING STATS SCHEMAS
# ==============================================================================

class HeartbeatDashboardStats(BaseModel):
    total_monitored_fdrs: int = 0
    total_monitored: int = 0
    alive_count: int = 0
    stale_count: int = 0
    broken_count: int = 0
    unresponsive_count: int = 0
    not_started_count: int = 0
    total_checks_count: int = 0
    pending_checks_count: int = 0
    upcoming_checks_count: int = 0
    overdue_checks_count: int = 0
    upcoming_maturities_count: int = 0
    upcoming_maturities_30d: int = 0
    active_alerts_count: int = 0
    critical_alerts_count: int = 0
    compliance_rate_percent: float = 100.0
    recent_activity: List[Dict[str, Any]] = []
