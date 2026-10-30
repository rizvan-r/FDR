# FDR-Chain — Phase 6: Officer Dashboard and Priority Queue

Act as a senior full-stack engineer implementing Phase 6 of FDR-Chain, a government-grade FDR Security Deposit Management Portal.

Implement a centralized, role-aware officer workspace that combines tasks from the existing Phase 1–5 modules.

## 1. Technology stack

Preserve the existing stack:

- React + Vite + TypeScript
- Tailwind CSS
- Existing UI component library
- Python FastAPI
- Supabase PostgreSQL
- Supabase Auth
- Existing RBAC and RLS
- Existing audit logging
- Existing FDR, verification, heartbeat, renewal, and lineage modules

Do not introduce another database or rewrite previous modules.

## 2. Repository inspection

Before coding:

1. Inspect the complete repository.
2. Inspect existing migrations and database tables.
3. Inspect all six existing roles.
4. Inspect institution and region authorization.
5. Inspect Phase 2 FDR repository.
6. Inspect Phase 3 bank verification.
7. Inspect Phase 4 heartbeat and alert functionality.
8. Inspect Phase 5 renewal and lineage functionality.
9. Inspect notification and audit implementations.
10. Identify reusable frontend pages and backend services.

Provide a short inspection report.

Do not assume previous implementation prompts were successfully executed. Verify the actual implementation.

Preserve all working Phase 1–5 features.

## 3. Phase 6 scope

Implement:

- Role-aware officer dashboard.
- Unified priority queue.
- Task creation and synchronization with existing modules.
- Priority scoring.
- Task assignment and reassignment.
- Task lifecycle management.
- Officer comments.
- Escalation management.
- Workload dashboard.
- Officer notifications.
- Queue policy administration.
- Audit history.
- Tests and documentation.

Do not start Phase 7.

## 4. Database migration

Create a new Phase 6 migration.

Reuse an existing notification or task system if one already exists. Extend it instead of creating duplicate functionality.

### A. officer_tasks

Create:

- id UUID primary key
- task_type TEXT
- source_type TEXT
- source_id UUID
- institution_id UUID nullable
- region_id UUID nullable
- assigned_to UUID nullable
- created_by UUID nullable
- priority_score INTEGER
- priority_level TEXT
- priority_reasons JSONB
- task_status TEXT
- due_at TIMESTAMPTZ nullable
- started_at TIMESTAMPTZ nullable
- completed_at TIMESTAMPTZ nullable
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

Allowed task statuses:

- open
- in_progress
- waiting
- completed
- cancelled

Allowed priority levels:

- critical
- high
- medium
- low

Create a safe source-reference strategy. Do not treat a polymorphic source_type/source_id pair as a normal foreign key.

Validate source record existence and authorization in backend services.

Prevent duplicate unresolved tasks for the same source event using an appropriate unique constraint or deduplication key.

### B. task_assignments

Create:

- id UUID primary key
- task_id UUID foreign key
- assigned_to UUID
- assigned_by UUID
- assignment_note TEXT
- assigned_at TIMESTAMPTZ
- unassigned_at TIMESTAMPTZ nullable

Preserve assignment history.

### C. task_comments

Create:

- id UUID primary key
- task_id UUID foreign key
- user_id UUID
- comment_text TEXT
- created_at TIMESTAMPTZ

Retain comment history and authorize access by task scope.

### D. task_escalations

Create:

- id UUID primary key
- task_id UUID foreign key
- escalation_level INTEGER
- escalated_from UUID nullable
- escalated_to UUID nullable
- reason TEXT
- escalated_at TIMESTAMPTZ
- acknowledged_at TIMESTAMPTZ nullable
- resolved_at TIMESTAMPTZ nullable

Preserve escalation history.

### E. officer_notifications

Inspect the existing notification schema.

If it does not exist, create:

- id UUID primary key
- recipient_user_id UUID
- task_id UUID nullable
- notification_type TEXT
- title TEXT
- message TEXT
- read_at TIMESTAMPTZ nullable
- created_at TIMESTAMPTZ

### F. Queue policies

Create configurable priority and escalation policies.

Support:

- Priority weights.
- Priority thresholds.
- Task deadline rules.
- Escalation timing.
- Escalation recipient role.
- Policy active status.
- Policy creator and timestamps.

Do not hardcode official regulatory deadlines.

## 5. Automatic task generation

Build a dedicated task synchronization service.

Integrate with:

- Phase 3 verification requests.
- Phase 4 heartbeat checks.
- Phase 4 maturity alerts.
- Phase 5 renewal cases.
- Existing evidence review functionality.

Generate tasks for:

- Broken FDR review.
- Stale heartbeat review.
- Unresponsive heartbeat review.
- Pending bank verification.
- Overdue verification.
- Renewal approval.
- Renewal evidence review.
- Upcoming maturity follow-up.
- Escalation acknowledgement.

Requirements:

- Avoid duplicate tasks.
- Use a stable deduplication key.
- Update existing tasks when their source changes.
- Preserve task history.
- Complete or cancel tasks only when the source workflow justifies it.
- Do not mark a task completed merely because a source record was edited.
- Make synchronization idempotent.

Do not create a second copy of the source workflow. The original module remains responsible for its business decisions.

## 6. Priority calculation engine

Implement a centralized, configurable priority scoring service.

Prototype weights:

- Broken FDR: +100
- Unresponsive heartbeat: +70
- Stale heartbeat: +40
- Deadline exceeded: +50
- Deadline within 24 hours: +35
- Deadline within 7 days: +20
- Renewal awaiting officer review: +20
- Missing required evidence: +15
- Escalated case: +30

Suggested priority thresholds:

- Critical: score >= 100
- High: score >= 70
- Medium: score >= 35
- Low: score < 35

Treat these values as configurable prototype defaults.

Avoid double-counting the same underlying event.

Return:

- Priority score.
- Priority level.
- Reason codes.
- Human-readable explanation.
- Deadline.
- Age of task.
- Escalation status.

Recalculate priorities safely when source status, deadline, or policy changes.

Priority scoring must never approve, reject, renew, release, or close an FDR.

## 7. Task lifecycle

Implement the following workflow:

- open
- in_progress
- waiting
- completed
- cancelled

Provide centralized transition validation.

Require authorized users to provide appropriate notes when completing or cancelling a task.

Validate the source workflow before completing related tasks.

A task being completed does not automatically approve its underlying FDR or renewal case.

## 8. Assignment management

Implement:

- Self-assignment where permitted.
- Assignment to another authorized officer.
- Reassignment.
- Assignment notes.
- Assignment history.
- Unassignment.
- My Tasks filter.
- Unassigned Tasks filter.

Validate recipient role and institution/region scope on the backend.

Do not allow arbitrary user IDs to be assigned from the client.

## 9. Escalation management

Implement configurable escalation policies.

Prototype behavior:

- Critical task: immediate notification to designated supervisor.
- High-priority overdue task: escalate after configured delay.
- Unacknowledged escalation: advance to the next configured stage.
- Resolved escalation: preserve historical record.

Prevent duplicate active escalations for the same stage.

Record:

- Escalation reason.
- Previous responsible officer.
- Recipient.
- Timestamp.
- Acknowledgement.
- Resolution.

Do not assume every case escalates to the same role.

## 10. Officer dashboard

Create role-aware dashboards.

### Regulation Bureau Officer / Head

Show authorized regulatory overview, critical cases, pending reviews, escalations, and regional summaries.

### Regional Officer

Show region-scoped FDR cases, institution tasks, stale and unresponsive FDRs, and pending renewals.

### Institution User

Show institution-specific FDR tasks, submitted renewals, missing evidence, and bank response status.

### Bank Nodal Officer

Show bank-specific verification requests and pending heartbeat responses.

### Finance / Accounts Officer

Show authorized financial monitoring, maturity-related work, and applicable financial review tasks.

### System Administrator

Show system configuration, user administration, queue policy, scheduler/task synchronization health, and authorized operational metrics.

Never expose records outside a user's authorized scope.

## 11. Backend APIs

Implement:

- GET `/api/v1/officer/dashboard`
- GET `/api/v1/officer/tasks`
- GET `/api/v1/officer/tasks/{id}`
- POST `/api/v1/officer/tasks/{id}/assign`
- POST `/api/v1/officer/tasks/{id}/start`
- POST `/api/v1/officer/tasks/{id}/wait`
- POST `/api/v1/officer/tasks/{id}/complete`
- POST `/api/v1/officer/tasks/{id}/comments`
- GET `/api/v1/officer/tasks/{id}/history`
- POST `/api/v1/officer/tasks/{id}/escalate`
- GET `/api/v1/officer/workload`
- GET `/api/v1/officer/notifications`
- PATCH `/api/v1/officer/notifications/{id}/read`

Create administrator-only policy endpoints.

Support:

- Pagination.
- Sorting.
- Search.
- Filters.
- Date ranges.
- Priority filters.
- Assignment filters.
- Status filters.

Use Pydantic request and response models.

Enforce JWT, RBAC, institution scoping, region scoping, source authorization, and audit logging.

## 12. Frontend pages

Use the existing Government Enterprise design system.

Create:

### A. OfficerDashboardPage

Display:

- Open tasks.
- Critical tasks.
- High-priority tasks.
- Overdue tasks.
- Awaiting bank response.
- Awaiting officer review.
- Completed this month.
- Average processing time.
- Pending escalations.
- Recent activity.

Use real API data.

### B. PriorityQueuePage

Display a filterable and sortable task table.

Columns:

- Priority.
- Task title.
- Task type.
- FDR number.
- Institution.
- Region.
- Deadline.
- Task age.
- Assigned officer.
- Task status.

Show the priority explanation.

### C. OfficerTaskDetailsPage

Display:

- Source record information.
- FDR details.
- Bank verification information.
- Heartbeat history.
- Renewal status.
- Relevant documents.
- Assignment history.
- Comments.
- Escalation history.
- Authorized actions.

Load only data the user can access.

### D. OfficerWorkloadPage

Display:

- Officer name.
- Role.
- Assigned tasks.
- Critical tasks.
- Overdue tasks.
- Completed tasks.
- Workload distribution.

Provide assignment controls to authorized supervisors.

### E. EscalationCenterPage

Display:

- Escalated tasks.
- Severity.
- Reason.
- Escalation stage.
- Recipient.
- Acknowledgement status.
- Resolution status.

### F. QueuePolicyPage

Administrator-only settings for:

- Priority weights.
- Priority thresholds.
- Deadline policies.
- Escalation timing.
- Recipient roles.

Validate policy values.

### G. Reusable components

Create or reuse:

- PriorityBadge
- TaskStatusBadge
- PriorityReasonPanel
- OfficerTaskTable
- TaskAssignmentDialog
- TaskCommentPanel
- TaskHistoryTimeline
- EscalationCard
- WorkloadSummary
- OfficerNotificationBell

Include loading, error, empty, and responsive states.

## 13. Security and database policies

Enable RLS on all new tables.

Use existing authorization helpers after inspecting their actual definitions.

Enforce:

- Institution isolation.
- Bank isolation.
- Region isolation.
- Role-based access.
- Assignment permissions.
- Comment permissions.
- Escalation permissions.
- Policy administration permissions.

Only trusted backend services may generate or modify system tasks and calculated priority fields.

Never allow the browser to forge task source, priority score, escalation state, or assignment permissions.

Review SQL grants as well as RLS.

## 14. Testing

Create backend tests for:

- Task generation.
- Duplicate task prevention.
- Source synchronization.
- Priority calculations.
- Priority policy changes.
- Task lifecycle transitions.
- Assignment and reassignment.
- Invalid officer assignment.
- Escalation creation.
- Escalation acknowledgement.
- Escalation resolution.
- Duplicate escalation prevention.
- Notification creation.
- Unauthorized task access.
- Cross-institution access.
- Cross-region access.
- Dashboard data isolation.
- Workload calculations.
- Task completion versus source approval separation.

Create frontend tests for:

- Dashboard loading.
- Priority sorting.
- Filtering.
- Pagination.
- Task assignment.
- Task details.
- Comments.
- Escalation actions.
- Notifications.
- Policy form validation.

Run previous Phase 1–5 regression tests.

Do not claim tests passed unless actually executed.

## 15. Documentation

Create:

- `docs/PHASE_6_OFFICER_DASHBOARD.md`
- `docs/PHASE_6_PRIORITY_ENGINE.md`
- `docs/PHASE_6_TASK_MANAGEMENT.md`
- `docs/PHASE_6_ESCALATION.md`
- `docs/PHASE_6_API.md`
- `docs/PHASE_6_TESTING.md`

Document migrations, role permissions, priority rules, task synchronization, escalation configuration, APIs, and Windows startup commands.

## 16. Strict boundaries

Implement Phase 6 only.

Do not implement:

- Phase 7 migration and document-generation enhancements.
- New FDR verification systems.
- New heartbeat mechanisms.
- New renewal workflows.
- Automatic FDR approvals or rejections.
- Automatic release or refund decisions.
- Real production bank integrations.
- Real production AICTE integrations.
- Unrequested AI decision-making features.

Preserve all previous phases.

## 17. Completion report

Provide:

1. Repository inspection report.
2. Files created and modified.
3. Database migration details.
4. Task generation and synchronization behavior.
5. Priority scoring rules.
6. Assignment and escalation behavior.
7. New APIs.
8. Frontend pages.
9. Security and RLS changes.
10. Tests actually executed.
11. Known limitations.
12. Windows commands.
13. Manual end-to-end verification steps.

STOP after Phase 6. Wait for explicit approval before Phase 7.