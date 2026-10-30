# FDR-Chain — Phase 6: REST API Specification

## 1. Overview
The Phase 6 REST API provides role-aware endpoints mounted under `/api/v1/officer` in FastAPI. All requests require valid JWT Bearer authentication and enforce role, institution, and regional jurisdiction scopes.

---

## 2. Endpoint Catalog

### A. Dashboard & Metrics
#### `GET /api/v1/officer/dashboard`
- **Description**: Returns role-scoped operational KPIs, urgency counters, and recent activity logs.
- **Authorization**: All authenticated roles. Data is dynamically filtered to the caller's authorized scope.
- **Response**: `200 OK`
```json
{
  "open_tasks": 3,
  "critical_tasks": 1,
  "high_priority_tasks": 1,
  "overdue_tasks": 0,
  "awaiting_bank_response": 1,
  "awaiting_officer_review": 1,
  "completed_this_month": 12,
  "average_processing_hours": 14.5,
  "pending_escalations": 1,
  "recent_activity": [
    {
      "time": "2026-10-30T07:30:00Z",
      "action": "Task Started",
      "user": "Dr. Rajeshwar Sharma",
      "fdr": "FDR-2025-DRDO-77291"
    }
  ]
}
```

---

### B. Priority Queue & Task Management
#### `GET /api/v1/officer/tasks`
- **Description**: Lists officer tasks with filtering, search, pagination, and dynamic priority ordering.
- **Query Parameters**:
  - `status` (`open`, `in_progress`, `waiting`, `completed`, `cancelled`)
  - `priority_level` (`critical`, `high`, `medium`, `low`)
  - `assigned_to` (UUID)
  - `task_type` (`broken_fdr_review`, `unresponsive_heartbeat`, `renewal_approval`, etc.)
  - `search` (text query on title, FDR number, institution)
  - `my_tasks` (boolean: filter to caller's assigned tasks)
  - `unassigned_only` (boolean)
  - `limit` (integer, default: 50)
  - `offset` (integer, default: 0)

#### `GET /api/v1/officer/tasks/{id}`
- **Description**: Retrieves comprehensive task details including source data snapshot, associated FDR details, assignment history, comment thread, and escalations.

#### `POST /api/v1/officer/tasks/sync`
- **Description**: Idempotently scans Phase 3, 4, and 5 modules and creates or updates tasks with deterministic deduplication keys.
- **Authorization**: `system_admin`, `bureau_officer`, `regional_officer`.

---

### C. Task Lifecycle Transitions
#### `POST /api/v1/officer/tasks/{id}/start`
- **Description**: Transitions task from `open` or `waiting` to `in_progress`.
- **Payload**: `{"note": "Initiating formal branch review"}`

#### `POST /api/v1/officer/tasks/{id}/wait`
- **Description**: Transitions task to `waiting` pending external dependency.
- **Payload**: `{"reason": "Awaiting branch manager affidavit"}`

#### `POST /api/v1/officer/tasks/{id}/complete`
- **Description**: Marks review task completed with mandatory completion audit note.
- **Payload**: `{"completion_note": "Bank confirmed collateral restored under new deposit voucher."}`

#### `POST /api/v1/officer/tasks/{id}/cancel`
- **Description**: Cancels or dismisses review task with mandatory reason.
- **Payload**: `{"reason": "Duplicate source alert dismissed after technical resolution."}`

---

### D. Assignments & Collaboration
#### `POST /api/v1/officer/tasks/{id}/assign`
- **Description**: Assigns, reassigns, or unassigns an officer task. Validates recipient role and jurisdiction.
- **Payload**:
```json
{
  "assigned_to": "usr-bureau-01",
  "assignment_note": "Reassigned for Bureau-level review."
}
```

#### `POST /api/v1/officer/tasks/{id}/comments`
- **Description**: Posts an internal discussion comment to the task thread.
- **Payload**:
```json
{
  "comment_text": "Spoke with SBI branch manager; formal affidavit expected by 16:00."
}
```

#### `GET /api/v1/officer/tasks/{id}/history`
- **Description**: Returns chronological assignment audit history from `task_assignments`.

---

### E. Supervisory Escalations
#### `POST /api/v1/officer/tasks/{id}/escalate`
- **Description**: Triggers Stage 1 or Stage 2 escalation to supervisory personnel.
- **Payload**:
```json
{
  "reason": "Branch unresponsiveness exceeds 48-hour statutory regulatory threshold.",
  "target_role": "bureau_officer"
}
```

#### `POST /api/v1/officer/tasks/{id}/escalations/{esc_id}/acknowledge`
- **Description**: Records supervisor's formal receipt and acceptance of an escalation.
- **Payload**: `{"note": "Acknowledged. Intervening with regional director."}`

#### `POST /api/v1/officer/tasks/{id}/escalations/{esc_id}/resolve`
- **Description**: Formally resolves an escalation with legally sufficient justification.
- **Payload**: `{"resolution_note": "Affidavit received, lien verified, risk cleared."}`

---

### F. Staff Workload & Notifications
#### `GET /api/v1/officer/workload`
- **Description**: Returns active task distribution and SLA performance metrics per officer.
- **Authorization**: `system_admin`, `bureau_officer`, `regional_officer`.

#### `GET /api/v1/officer/notifications`
- **Description**: Retrieves recent in-app notifications for the caller.

#### `PATCH /api/v1/officer/notifications/{id}/read`
- **Description**: Marks a specific officer notification as read.

---

### G. Policy Administration
#### `GET /api/v1/officer/policies`
- **Description**: Returns active priority scoring and escalation policies.
- **Authorization**: `system_admin`.

#### `PUT /api/v1/officer/policies/{id}`
- **Description**: Deploys updated priority weights, risk tier thresholds, SLA timers, and escalation roles.
- **Authorization**: `system_admin` strictly.
