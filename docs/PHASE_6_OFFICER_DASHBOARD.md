# FDR-Chain — Phase 6: Officer Dashboard Architecture Documentation

## 1. Executive Summary
Phase 6 establishes a centralized, role-aware operational command post for regulatory officers, regional supervisors, bank nodal officers, institutional liaisons, and system administrators. 

Before Phase 6, surveillance events (broken liens, stale heartbeats), verification requests, and renewal cases were distributed across specialized departmental pages. Phase 6 unifies these workflows into a role-scoped, intelligent **Officer Dashboard & Unified Priority Queue** that aggregates actionable tasks, computes dynamic non-destructive risk scores, manages task lifecycle, tracks officer assignments, records structured comments, provides supervisory escalations, and visualizes staffing workloads.

---

## 2. Role-Aware Dashboard Matrix

In compliance with the six established AICTE / FDR-Chain roles, the dashboard dynamically scopes KPIs, operational feeds, and quick actions:

| Role | Authorized Scope & Presentation | Key Actionables & KPIs |
| :--- | :--- | :--- |
| **Regulation Bureau Officer / Head** (`bureau_officer`) | National jurisdiction overview across all institutions, regions, and banking partners. | Critical lien breach cases, Bureau-level Stage 2 escalations, cross-regional bottlenecks, SLA compliance. |
| **Regional Officer** (`regional_officer`) | Territorial jurisdiction scoped to the officer's designated geographic region (`region_id`). | Regional institutional alerts, overdue bank verification responses, regional renewal cases, Stage 1 escalations. |
| **Institution User** (`institution_user`) | Scoped exclusively to the user's registered educational institution (`institution_id`). | Pending renewal submissions, missing evidence requests, bank attestation statuses for institutional deposits. |
| **Bank Nodal Officer** (`bank_nodal_officer`) | Scoped to the officer's financial institution (`bank_id`). | Pending digital verification requests, heartbeat surveillance pings, collateral queries. |
| **Finance / Accounts Officer** (`finance_officer`) | Financial monitoring scope across all authorized deposit accounts. | Upcoming deposit maturities (30/60/90 days), renewal rollover verifications, interest & value parity reviews. |
| **System Administrator** (`system_admin`) | Full platform administrative and audit oversight. | Queue policy configuration, task synchronization health, staff workload rebalancing, audit logging. |

---

## 3. Dashboard UI Components & Layout

The dashboard is structured into high-impact operational zones following the Government Enterprise Design System:

1. **National Operational Metric Cards**:
   - `Open Review Tasks`: Active workload requiring human assessment.
   - `Critical Priority`: Tasks with score $\ge 100$ (e.g. broken FDR or lien discharge).
   - `Overdue Review SLA`: Tasks that have breached statutory turnaround timers.
   - `Awaiting Bank Response`: Upstream bank verification or heartbeat pending.
   - `Awaiting Officer Review`: Submitted renewal cases and evidence dossiers.
   - `Completed This Month`: Resolved operational reviews.
   - `Average Processing Time`: Efficiency SLA metric (hours).
   - `Active Escalations`: Number of tasks under supervisory review.

2. **Actionable Task Sub-Queues (Tabbed Interface)**:
   - **Critical & High Priority**: Filtered directly to emergency response matters.
   - **My Assigned Tasks**: Quick access to tasks claimed by or delegated to the logged-in officer.
   - **Awaiting External Response**: Tracks bottlenecks outside the regulator's desk.
   - **Recent Activity Feed**: Real-time chronological audit trail of officer assignments, transitions, and comments.

3. **Quick Command Actions**:
   - One-click trigger for idempotent task synchronization (`POST /api/v1/officer/tasks/sync`).
   - Deep-linking to the full **Priority Queue** (`/officer/queue`), **Staff Workload Desk** (`/officer/workload`), and **Escalation Center** (`/officer/escalations`).

---

## 4. Architectural Boundaries & Non-Destructive Principles

1. **Separation of Task Review and Business Decisions**:
   - Completing an officer task strictly signifies operational review completion.
   - It **never** automatically approves, rejects, releases, or discharges an underlying FDR or renewal case.
   - All legal status transitions must occur within their authorized domain engines (Phase 2, 3, 4, or 5).

2. **Idempotent Source Synchronization**:
   - Tasks are synchronized from upstream domain entities using deterministic deduplication keys (`f"{source_type}:{source_id}:{task_type}"`).
   - Upstream edits update task priority scores and deadlines without creating duplicate review items.
