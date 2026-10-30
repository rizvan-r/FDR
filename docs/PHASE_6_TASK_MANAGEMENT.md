# FDR-Chain — Phase 6: Task Management & Synchronization

## 1. Overview
The **Task Management Subsystem** (`app.services.task_service.TaskService`) manages the operational review lifecycle of compliance items generated across FDR-Chain. It provides centralized state transitions, deterministic synchronization, delegation control, and persistent assignment/comment histories.

---

## 2. Task Lifecycle State Machine

Tasks progress through five formalized operational states:

```
                  +----------------------------------+
                  |               OPEN               |
                  +----------------------------------+
                        |                      |
             [Start / Claim]                   | [Cancel / Dismiss]
                        v                      v
        +-----------------------+      +-------------------+
        |      IN_PROGRESS      |      |     CANCELLED     |
        +-----------------------+      +-------------------+
          |         ^        |                 ^
  [Pause /|         |        |                 |
  Waiting]|  [Resume]        | [Complete]      |
          v         |        v                 |
    +--------------------+  +---------------------+
    |      WAITING       |  |      COMPLETED      |
    +--------------------+  +---------------------+
```

### Transition Invariants
1. **Transition from Final States**: Once a task enters `completed` or `cancelled`, it is permanently sealed and cannot transition back to active states.
2. **Mandatory Audit Notes**:
   - Transition to `completed` requires a detailed `completion_note` describing remedial actions taken or verification checks performed.
   - Transition to `cancelled` requires a justified cancellation `reason`.
   - Transition to `waiting` requires specifying the external blocker (e.g., awaiting physical bank branch reply).
3. **No Automatic Business Action**: Completing a review task records that the human regulatory review is finished. It **does not** automatically alter the status of the source entity (e.g. it does not approve a renewal or release a lien).

---

## 3. Idempotent Source Synchronization

Task synchronization (`TaskService.sync_tasks_from_sources`) automatically generates and updates tasks from upstream modules without producing duplicate items:

### Sources Synchronized
- **Phase 3 (Bank Verification)**:
  - Pending verification requests $\to$ `pending_verification` tasks.
  - Overdue verification requests $\to$ `overdue_verification` tasks.
- **Phase 4 (Surveillance & Heartbeats)**:
  - Critical lien breaches / broken FDRs $\to$ `broken_fdr_review` tasks.
  - Unresponsive depository branches $\to$ `unresponsive_heartbeat` tasks.
  - Stale verification cadences $\to$ `stale_heartbeat` tasks.
- **Phase 5 (Renewal Cases)**:
  - Submitted renewal cases $\to$ `renewal_approval` tasks.
  - Cases with missing deposit evidence $\to$ `renewal_evidence_review` tasks.

### Deduplication Strategy
To avoid multiple unresolved tasks for the same event, every task uses a unique composite deduplication key:
$$\text{dedup\_key} = \text{source\_type} + \text{":"} + \text{source\_id} + \text{":"} + \text{task\_type}$$

- When a source changes (e.g., score changes, deadline approaches), the existing task is updated in place.
- Resolved or completed tasks retain their final state.

---

## 4. Assignment & Reassignment Engine

Task assignment maintains complete accountability:
- **Assignment Authorization**: Backend services validate that the recipient officer possesses an authorized role (`bureau_officer`, `regional_officer`, `system_admin`, `finance_officer`, `bank_nodal_officer`) and matches the institutional/regional scope of the task. Arbitrary user IDs from the client are strictly rejected.
- **Self-Assignment**: Permitted for authorized officers operating within their territorial jurisdiction.
- **Assignment History**: Every assignment, reassignment, and unassignment action appends an immutable entry to `task_assignments` with `assigned_to`, `assigned_by`, `assignment_note`, and `assigned_at` timestamps.

---

## 5. Officer Comments & Collaborative Audit

- Officers can post internal notes and inquiries regarding a task via `POST /api/v1/officer/tasks/{id}/comments`.
- Comments are scoped to authorized officers and retained immutably in `task_comments` for longitudinal audit trails.
