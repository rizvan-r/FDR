# FDR-Chain — Phase 6: Escalation & Workload Management

## 1. Executive Summary
The **Escalation Management Subsystem** (`app.services.task_service.TaskService`) establishes formal supervisory protocols when operational tasks encounter regulatory non-compliance, bank unresponsiveness, or overdue statutory SLAs.

It prevents tasks from lingering in an unreviewed state by advancing unacknowledged bottlenecks through multi-tier supervisory levels.

---

## 2. Multi-Stage Escalation Hierarchy

```
[Operational Review Task]
         |
         | (Critical Lien Breach OR Overdue SLA Exceeded)
         v
+------------------------------------+
|        STAGE 1 ESCALATION          |
| Target: Regional Officer           |
| Action: Formal Review Notice       |
+------------------------------------+
         |
         | (Unacknowledged past Stage 1 SLA window)
         v
+------------------------------------+
|        STAGE 2 ESCALATION          |
| Target: Regulation Bureau Head     |
| Action: National Bureau Intervention|
+------------------------------------+
```

### Escalation Invariants
1. **Duplicate Prevention**: A task cannot have multiple active, unacknowledged escalations for the same stage level.
2. **Sequential Progression**: Escalations advance progressively (Level 1 $\to$ Level 2) rather than jumping tiers arbitrarily.
3. **Formal Acknowledgement**: Supervisors must record formal receipt via `POST /api/v1/officer/tasks/{id}/escalations/{esc_id}/acknowledge`.
4. **Resolution with Justification**: To close an escalation, a supervisor must submit a legally sufficient `resolution_note` via `POST /api/v1/officer/tasks/{id}/escalations/{esc_id}/resolve`.
5. **Auditable Retention**: Resolving an escalation preserves the historical record and timestamps permanently in `task_escalations`.

---

## 3. Workload Staffing Dashboard

The Workload Subsystem aggregates active task distribution across all authorized officers to balance regulatory responsibilities:

- **Metrics per Officer**:
  - `assigned_tasks`: Total active cases currently claimed or assigned.
  - `critical_tasks`: Number of emergency/critical cases requiring immediate turnaround.
  - `overdue_tasks`: Cases where statutory deadlines have expired.
  - `completed_tasks`: Historical throughput of successfully closed reviews.
- **Supervisor Controls**:
  - Supervisors (`system_admin`, `bureau_officer`, `regional_officer`) can reassign cases directly from the Workload interface to alleviate overloaded desks.
