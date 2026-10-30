# FDR-Chain — Phase 4 Implementation: Heartbeat Monitoring

You are a senior full-stack software engineer working on **FDR-Chain**, a government-grade FDR Security Deposit Management Portal for the AICTE regulatory workflow.

Implement **Phase 4: Heartbeat Monitoring** in the existing repository.

## 1. Existing technology stack

Preserve and use the existing project stack:

- Frontend: React + Vite + TypeScript
- UI: Tailwind CSS and the existing component library
- Backend: Python FastAPI
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth
- Authorization: Existing role-based access control and PostgreSQL RLS
- File storage: Private Supabase Storage
- Bank verification: Existing Phase 3 Tier 2 and Tier 3 implementation
- Digital signatures: Existing Ed25519 verification
- Icons: Lucide React

Do not introduce MongoDB, Firebase, or another database.

## 2. Mandatory repository inspection

Before writing code:

1. Inspect the complete frontend and backend folder structures.
2. Read the existing database migrations.
3. Inspect the existing Supabase tables, RLS policies, SQL functions, triggers, and constraints.
4. Inspect authentication and authorization middleware.
5. Inspect the existing FDR repository and FDR details pages.
6. Inspect the Phase 3 bank verification, bank attestation, and public-key verification services.
7. Inspect existing audit event and notification functionality.
8. Inspect environment variables and Docker configuration.
9. Identify existing reusable components and services.

Produce a short implementation assessment before changing files.

**Important:** Previous phase implementation plans do not prove that their code or migrations were executed. Use the actual repository as the source of truth.

Do not overwrite working Phase 1–3 functionality. Reuse existing functions and components where appropriate. If a required Phase 3 component is missing, document the dependency and implement only the minimum safe integration needed for Phase 4.

## 3. Phase 4 scope

Implement:

- Configurable heartbeat policies.
- Automatic heartbeat scheduling.
- Bank re-attestation requests.
- Tier 2 heartbeat confirmation.
- Tier 3 signed heartbeat attestation.
- Heartbeat status management.
- Retry and timeout handling.
- Heartbeat history.
- FDR maturity monitoring.
- Maturity alerts.
- Officer alert management.
- Heartbeat dashboard.
- Admin policy configuration.
- Tests and documentation.

Do not start Phase 5 renewal and lineage functionality.

## 4. Database migration

Create a new migration named appropriately for Phase 4.

Never recreate Phase 1–3 tables. Inspect existing definitions and adapt the migration.

### A. Extend FDR records

Add these fields to `fdrs` if missing:

- `last_heartbeat_at TIMESTAMPTZ`
- `next_heartbeat_at TIMESTAMPTZ`
- `heartbeat_failure_count INTEGER NOT NULL DEFAULT 0`

Retain the existing heartbeat status field and its current constraint. If the existing status constraint does not support the required statuses, update it through a safe migration.

Required monitoring statuses:

- `not_started`
- `alive`
- `stale`
- `broken`
- `unresponsive`

Do not modify lifecycle status or trust tier merely because a heartbeat is successful or unsuccessful.

### B. heartbeat_policies

Create a policy table with:

- id
- name
- heartbeat_interval_days
- stale_after_days
- response_timeout_hours
- max_retries
- retry_interval_hours
- maturity_alert_days (integer array or a normalized child table)
- is_active
- created_at
- updated_at
- created_by

Add validation constraints for sensible positive values.

Support a default active policy and an optional authorized override where the existing project requirements support it.

If policies can be scoped by institution or bank, enforce that scope explicitly and prevent conflicting active policies.

### C. heartbeat_checks

Create an append-only history table with:

- id
- fdr_id
- bank_id
- check_number
- check_status
- verification_method
- requested_at
- response_due_at
- completed_at
- retry_count
- request_snapshot JSONB
- attestation_id
- failure_reason
- created_at
- updated_at

Allowed check statuses:

- scheduled
- requested
- confirmed
- rejected
- timed_out
- cancelled

Allowed methods:

- tier2_bank_confirmation
- tier3_digital_signature

Add:

- Foreign keys.
- Suitable indexes.
- Unique FDR/check-number constraint.
- Protection against duplicate active heartbeat checks for one FDR.
- Appropriate validation constraints.

Keep previous heartbeat records. Never overwrite historical check results.

### D. fdr_alerts

Create an alerts table containing:

- id
- fdr_id
- alert_type
- severity
- title
- description
- due_at
- is_read
- is_resolved
- assigned_to
- resolution_note
- resolved_at
- created_at
- updated_at

Support alert types for:

- heartbeat_due
- heartbeat_stale
- heartbeat_broken
- heartbeat_unresponsive
- maturity_90_days
- maturity_60_days
- maturity_30_days
- maturity_7_days
- maturity_1_day
- maturity_today
- maturity_overdue

Use a deduplication strategy so that repeated scheduler runs cannot create duplicate alerts for the same FDR and alert event.

### E. Phase 3 integration

Inspect the existing `bank_attestations` schema.

Associate heartbeat checks with the corresponding bank attestation.

Prefer adding a nullable `heartbeat_check_id` foreign key to `bank_attestations` if compatible with the existing schema and constraints.

If that is not safe, store the attestation reference in `heartbeat_checks`.

Reuse Phase 3 signature verification, bank-key validation, token validation, and replay protection.

Do not create a second independent signature-verification implementation.

### F. Database security

Enable RLS on all new tables.

Apply the existing role and institution-scoping helpers after verifying their real names and behavior.

Expected access:

- Institution users: view heartbeat records and alerts belonging to their institution.
- Bank officers: access only heartbeat requests belonging to their authorized bank.
- Regional officers: access records within their assigned region.
- Bureau officers: access permitted regulatory monitoring records.
- Finance officers: access monitoring information needed for their authorized work.
- System administrators: manage heartbeat policies and authorized configuration.

Sensitive writes must be performed through trusted FastAPI services or properly restricted database functions.

Do not expose Supabase service-role credentials to React.

Review SQL privileges as well as RLS policies. RLS does not automatically grant table permissions.

## 5. Heartbeat scheduling service

Implement a separate scheduler process using the existing backend codebase.

For the prototype, use APScheduler with PostgreSQL-backed coordination and PostgreSQL advisory locks.

Do not start an unprotected scheduler inside every FastAPI worker.

Create a clear scheduler entry point and document how to run it locally and through Docker.

### Scheduler responsibilities

1. Find eligible FDRs.
2. Determine the applicable heartbeat policy.
3. Identify FDRs whose next heartbeat is due.
4. Check that no active heartbeat request already exists.
5. Create a heartbeat check.
6. Capture the FDR snapshot.
7. Create the bank request using the existing Phase 3 mechanisms.
8. Set the response deadline.
9. Schedule retry processing.
10. Update heartbeat status according to evidence and policy.
11. Generate maturity and heartbeat alerts.
12. Record all significant operations in the audit history.

Use database transactions where multiple records must change together.

Every scheduler task must be idempotent. A task running twice must not create duplicate requests, checks, alerts, or status changes.

Use database locks or another reliable concurrency-control mechanism.

## 6. Heartbeat request and bank response

### Tier 2 heartbeat

Reuse the Phase 3 secure token-confirmation workflow.

Requirements:

- Generate a cryptographically secure random token.
- Store only the token hash.
- Make the token single-use and time-limited.
- Bind it to the FDR, bank, institution, heartbeat check, and immutable request snapshot.
- Prevent replay and duplicate confirmation.
- Atomically consume the token and record the result.
- Do not log the raw token.
- Do not permit confirmation against changed FDR details.

### Tier 3 heartbeat

Reuse the existing Ed25519 signature verification implementation.

Validate:

- Bank identity.
- Registered key ID.
- Key validity and revocation.
- Signature.
- Payload schema.
- Audience.
- Timestamp.
- Unique nonce.
- FDR identity.
- Heartbeat check identity.
- FDR fields against the request snapshot.
- Pledge status.
- Bank-reported FDR existence and current state.

Reject invalid or mismatched attestations without upgrading trust.

### Bank response results

A successful bank response must provide evidence that the FDR still exists and remains pledged as required.

An explicit negative response must include a structured reason, such as:

- FDR not found.
- FDR closed.
- Pledge released.
- Pledge no longer valid.
- Bank record mismatch.
- Other bank-reported issue.

Do not treat network failure, timeout, invalid payload, or a missing response as an explicit negative bank confirmation.

## 7. Heartbeat status rules

Implement centralized backend status-transition logic.

Rules:

- First registration: `not_started`.
- Successful heartbeat: `alive`.
- Freshness threshold exceeded: `stale`.
- Explicit bank-confirmed problem: `broken`.
- No response after configured retries: `unresponsive`.
- Successful confirmation after stale: `alive`.
- Successful confirmation after unresponsive: `alive`.
- Successful confirmation after broken: requires authorized review and documented resolution.

A Broken FDR must not silently return to Alive after an ordinary successful scheduler run.

Never erase previous negative bank evidence.

Maintain the existing FDR trust tier independently:

- Successful Tier 2 heartbeat does not automatically upgrade Tier 1 to Tier 2 unless the applicable verification workflow explicitly establishes that initial verification.
- Successful Tier 3 heartbeat does not automatically rewrite historical verification evidence.
- A heartbeat failure does not erase the original verification record.

Create audit events for every meaningful status transition.

## 8. Retry and timeout handling

Implement configurable retry behavior.

Example prototype configuration:

- Response timeout: 48 hours.
- Maximum retries: 3.
- Retry interval: 24 hours.

These are prototype defaults, not official AICTE rules.

Behavior:

1. First request is created.
2. If there is no response by the deadline, schedule a retry if retries remain.
3. Record every retry attempt.
4. Do not create a new heartbeat check for each retry.
5. If all retries are exhausted, mark the check timed out and the FDR Unresponsive.
6. Generate an alert for the responsible officer.

A bank's explicit rejection should not be retried as though it were a timeout.

An invalid signature should be recorded as a verification failure and escalated for review; it must not be accepted or treated as a valid negative bank attestation.

## 9. Maturity monitoring

Implement maturity reminder generation using each FDR's `maturity_date`.

Suggested configurable default reminder windows:

- 90 days
- 60 days
- 30 days
- 7 days
- 1 day
- Maturity date
- Overdue

These are application reminder settings, not official regulatory deadlines.

Requirements:

- Generate reminders only once for each applicable FDR and reminder window.
- Handle date boundaries consistently using the configured application timezone.
- Avoid duplicate alerts on repeated scheduler execution.
- Display remaining days or overdue days.
- Assign alerts to authorized officers based on existing access and assignment rules.

Do not automatically:

- Renew an FDR.
- Release an FDR.
- Close an FDR.
- Approve a refund.
- Change financial details.

An FDR reaching its maturity date should generate an alert and follow the existing authorized review process.

## 10. Backend API implementation

Implement endpoints consistent with existing API conventions.

### Monitoring

- `GET /api/v1/heartbeat/dashboard`
- `GET /api/v1/heartbeat/fdrs`
- `GET /api/v1/fdrs/{fdr_id}/heartbeat`
- `GET /api/v1/fdrs/{fdr_id}/heartbeat/history`

### Manual checks

- `POST /api/v1/fdrs/{fdr_id}/heartbeat/request`

Allow only authorized users to initiate manual checks. Prevent duplicate active checks.

### Policy administration

- `GET /api/v1/admin/heartbeat-policies`
- `POST /api/v1/admin/heartbeat-policies`
- `PATCH /api/v1/admin/heartbeat-policies/{policy_id}`

Only authorized system administrators can manage policies.

### Alerts

- `GET /api/v1/alerts`
- `PATCH /api/v1/alerts/{alert_id}/read`
- `PATCH /api/v1/alerts/{alert_id}/assign`
- `PATCH /api/v1/alerts/{alert_id}/resolve`

Validate alert ownership, role, region, and assignment permissions.

### Security

For every endpoint:

- Validate Supabase JWT.
- Enforce backend RBAC.
- Enforce institution, bank, and region scoping.
- Validate request schemas with Pydantic.
- Avoid trusting client-supplied ownership fields.
- Prevent IDOR vulnerabilities.
- Return consistent error responses.
- Record sensitive operations in audit logs.

## 11. Frontend implementation

Follow the existing FDR-Chain Government Enterprise design system.

Do not redesign unrelated Phase 1–3 pages.

Create or update the following pages:

### A. HeartbeatDashboardPage

Display:

- Total monitored FDRs.
- Alive count.
- Stale count.
- Broken count.
- Unresponsive count.
- Upcoming heartbeat checks.
- Overdue checks.
- Upcoming maturity dates.
- Recent heartbeat activity.

Use real backend data, not hardcoded statistics.

### B. HeartbeatMonitoringPage

Create a searchable, filterable, paginated table.

Columns:

- FDR number.
- Institution.
- Bank.
- Amount.
- Trust tier.
- Heartbeat status.
- Last successful heartbeat.
- Next scheduled heartbeat.
- Maturity date.
- Actions.

Filters:

- Institution.
- Bank.
- Region.
- Heartbeat status.
- Trust tier.
- Maturity range.

Show a detailed FDR monitoring view when a row is opened.

### C. HeartbeatHistoryPage

Display:

- Check number.
- Request date.
- Response deadline.
- Bank response.
- Verification method.
- Retry count.
- Attestation reference.
- Result.
- Failure reason.
- Status transitions.

Show an understandable timeline.

### D. AlertCenterPage

Display:

- Heartbeat alerts.
- Maturity alerts.
- Broken FDR alerts.
- Unresponsive FDR alerts.
- Stale FDR alerts.

Include filters, unread status, severity, assigned officer, and resolution status.

### E. HeartbeatPolicyPage

Administrator-only configuration page.

Allow administrators to manage:

- Heartbeat interval.
- Stale threshold.
- Response timeout.
- Maximum retries.
- Retry interval.
- Maturity reminder windows.

Use React Hook Form and Zod if already present.

Validate policy values on both frontend and backend.

### F. Reusable components

Create or reuse:

- HeartbeatStatusBadge
- HeartbeatSummaryCards
- HeartbeatHistoryTimeline
- HeartbeatCheckTable
- HeartbeatAlertCard
- MaturityCountdown
- HeartbeatPolicyForm
- BankResponseEvidencePanel

Ensure responsive layouts, loading states, empty states, error states, and accessible controls.

## 12. Role-based dashboard behavior

Respect the existing six roles:

1. Institution User
2. Bank Nodal Officer
3. Regional Officer
4. Regulation Bureau Officer / Head
5. Finance / Accounts Officer
6. System Administrator

Display only data permitted by backend authorization.

Institution users should see their own FDR monitoring.

Bank officers should see authorized requests for their bank.

Regional officers should see their assigned region.

Bureau officers should see their permitted regulatory monitoring overview.

Finance officers should see relevant maturity and financial monitoring alerts.

System administrators should see configuration and system-level monitoring information.

Do not rely on frontend route hiding as the only security mechanism.

## 13. Testing requirements

Create backend unit and integration tests.

### Heartbeat tests

- First FDR heartbeat scheduling.
- Successful Tier 2 heartbeat.
- Successful Tier 3 heartbeat.
- Invalid signature.
- Expired bank key.
- Revoked bank key.
- Incorrect bank identity.
- Incorrect FDR identity.
- Snapshot mismatch.
- Replayed nonce.
- Duplicate active check prevention.
- Retry processing.
- Response timeout.
- Unresponsive transition.
- Explicit negative response.
- Broken status persistence.
- Successful recovery from Stale.
- Authorized recovery review from Broken.

### Scheduler tests

- Scheduler runs more than once without duplicate records.
- Concurrent workers cannot process the same check.
- Failed task can safely retry.
- Duplicate alerts are prevented.
- Database failure does not leave partially updated records.

### Maturity tests

- Each reminder window.
- Exact maturity date.
- Overdue maturity.
- Duplicate reminder prevention.
- Timezone boundary.
- Renewed or released FDR handling according to existing policy.

### Authorization tests

- Institution cannot view another institution's FDR.
- Bank cannot view another bank's requests.
- Regional officer cannot access another region.
- Unauthorized users cannot change policy.
- Unauthorized users cannot resolve alerts.
- Client cannot forge an attestation result.
- Client cannot directly upgrade heartbeat status.

### Frontend tests

- Dashboard loads actual data.
- Status filters work.
- History loads correctly.
- Alerts can be marked read.
- Assignment and resolution permissions work.
- Policy validation works.
- Loading and error states work.

Run the existing test suite and ensure previous Phase 1–3 tests continue passing.

## 14. Documentation

Update README and create:

- `docs/PHASE_4_HEARTBEAT_ARCHITECTURE.md`
- `docs/PHASE_4_DATABASE.md`
- `docs/PHASE_4_SCHEDULER.md`
- `docs/PHASE_4_API.md`
- `docs/PHASE_4_TESTING.md`

Document:

- Environment variables.
- Migration instructions.
- Scheduler startup.
- Local development commands for Windows.
- Docker startup.
- How to simulate bank responses.
- How to test timeouts and retries.
- How to simulate maturity alerts.
- How to troubleshoot failed checks.

Do not put private bank keys, Supabase service-role keys, or raw heartbeat tokens in documentation or source control.

## 15. Environment and deployment

Inspect the existing Docker Compose configuration.

Add a dedicated scheduler service only if compatible with the existing project.

Ensure:

- Backend and scheduler use the same validated environment configuration.
- Database credentials remain server-side.
- Scheduler health can be monitored.
- Scheduler logs do not expose tokens or secrets.
- Database connectivity is checked before jobs run.
- Failed scheduled tasks are observable.
- Scheduler restart does not duplicate work.

Provide exact Windows PowerShell commands for setup and execution.

## 16. Strict Phase 4 boundaries

Implement Phase 4 only.

Do not implement:

- Phase 5 renewal and FDR lineage.
- Parent-child replacement FDR relationships.
- Automated renewal matching.
- New financial release or refund approval workflows.
- Real bank API integrations.
- Real AICTE production integrations.
- Automatic financial decisions.
- Unrequested microservices.

Use the existing mock bank and simulated integration environment for the hackathon prototype.

Clearly label simulated bank interactions in the interface and documentation.

## 17. Completion report

When implementation is finished, provide:

1. Repository inspection findings.
2. Files created.
3. Files modified.
4. Database migration details.
5. Commands to apply migrations.
6. Scheduler startup instructions.
7. API endpoints implemented.
8. Frontend pages implemented.
9. Security and RLS changes.
10. Tests executed and their actual results.
11. Known limitations.
12. Manual verification steps.

Do not claim that a test, migration, integration, or feature works unless it was actually executed and verified.

**STOP after Phase 4. Do not begin Phase 5 until explicitly instructed.**