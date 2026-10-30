# FDR-CHAIN — PHASE 8 IMPLEMENTATION PROMPT
## FDR Release, Refund & Closure Management

Act as a senior full-stack developer, software architect, financial workflow engineer, database engineer and application security specialist.

Implement Phase 8 ONLY of my existing FDR-Chain project.

FDR-Chain is a Government Enterprise FDR Security Deposit Management Portal for the AICTE regulatory workflow.

The objective of Phase 8 is to build a controlled, auditable process for institutional FDR release requests, eligibility review, authorized approval, bank release tracking, refund recording, financial reconciliation and final closure.

# 1. EXISTING TECHNOLOGY STACK — DO NOT CHANGE

- Frontend: React + Vite + TypeScript
- Backend: Python FastAPI
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth
- Storage: Private Supabase Storage
- UI: Government Enterprise design system
- API: Existing FastAPI API architecture
- Migrations: Existing project migration conventions

Do not replace the existing stack.

# 2. FIRST TASK: INSPECT THE REPOSITORY

Before modifying code:

1. Inspect the entire existing frontend and backend structure.
2. Inspect all database migrations from Phases 1–7.
3. Inspect the actual FDR lifecycle implementation.
4. Inspect existing trust-tier and heartbeat status handling.
5. Inspect renewal cases and FDR lineage.
6. Inspect the officer priority queue and task assignments.
7. Inspect compliance documents and private file storage.
8. Inspect authentication, RBAC, institution/region scoping and RLS.
9. Inspect the audit trail and notification implementation.
10. Identify completed, incomplete and missing features.

Prepare an implementation plan based on the actual repository.

Do not assume previous phase prompts were executed.

Preserve all working features. Reuse existing models, services, tables and components where possible.

Do not recreate existing tables or duplicate functionality.

# 3. PHASE 8 MODULES

Implement these six modules:

1. Release request management.
2. Eligibility and compliance checklist.
3. Multi-level review and approval.
4. Bank release tracking.
5. Refund management and reconciliation.
6. Final closure and audit history.

# 4. RELEASE REQUEST MANAGEMENT

Allow an authorized institution user to:

- View permitted FDR records.
- Select an FDR for release consideration.
- Create a release request.
- Enter the release reason.
- Upload supporting documents.
- Save a draft.
- Submit the request.
- Track request status.
- Respond to correction requests.
- View review and decision history.

Prevent unauthorized users from submitting requests for other institutions.

Do not allow a request to silently overwrite an existing request.

Check for conflicting active requests for the same FDR.

Preserve historical requests.

# 5. ELIGIBILITY CHECKLIST ENGINE

Build a configurable checklist engine.

Example checklist categories:

- FDR identity and ownership.
- Applicable policy source.
- Bank verification evidence.
- FDR lifecycle status.
- Renewal and lineage history.
- Supporting documents.
- Outstanding compliance issues.
- Financial review.
- Authorized approval.

These are example checklist categories, not official universal AICTE release requirements.

Checklist requirements must be configurable by authorized administrators.

Every checklist item should include:

- Requirement title.
- Description.
- Required/optional flag.
- Review status.
- Evidence reference.
- Reviewer.
- Review timestamp.
- Review comments.
- Policy version.

Possible review statuses:

- pending
- satisfied
- not_satisfied
- not_applicable
- needs_clarification

Do not automatically approve a request because checklist items are marked satisfied.

Require authorized human review and a recorded decision.

# 6. POLICY VERSION MANAGEMENT

Create versioned release policy configuration.

Policy fields should include:

- Policy name.
- Policy version.
- Description.
- Source reference.
- Effective date range.
- Checklist configuration.
- Approval configuration.
- Active status.
- Creator.
- Creation timestamp.

Every release request must retain the policy version used during its review.

Do not invent AICTE regulations, release eligibility conditions, approval authorities, deadlines or required documents.

The policy configuration must be editable only by authorized administrators.

A policy change must not silently rewrite existing request requirements.

# 7. DATABASE IMPLEMENTATION

Inspect existing database definitions first.

Create a new Phase 8 migration and add the following logical entities if they do not already exist.

## fdr_release_requests

- id UUID primary key
- fdr_id UUID
- institution_id UUID
- requested_by UUID
- request_reason TEXT
- request_status TEXT
- policy_version_id UUID
- submitted_at TIMESTAMPTZ
- current_reviewer_id UUID nullable
- final_decision_by UUID nullable
- final_decision_at TIMESTAMPTZ nullable
- decision_comments TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

## release_policy_versions

- id UUID primary key
- policy_name TEXT
- policy_version TEXT
- policy_description TEXT
- source_reference TEXT
- effective_from TIMESTAMPTZ
- effective_until TIMESTAMPTZ nullable
- checklist_configuration JSONB
- approval_configuration JSONB
- is_active BOOLEAN
- created_by UUID
- created_at TIMESTAMPTZ

## release_checklist_items

- id UUID primary key
- release_request_id UUID
- policy_requirement_key TEXT
- requirement_title TEXT
- requirement_description TEXT
- is_required BOOLEAN
- review_status TEXT
- evidence_document_id UUID nullable
- reviewed_by UUID nullable
- reviewed_at TIMESTAMPTZ nullable
- review_comments TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

## release_reviews

- id UUID primary key
- release_request_id UUID
- review_stage TEXT
- reviewer_id UUID
- review_decision TEXT
- comments TEXT
- reviewed_at TIMESTAMPTZ
- created_at TIMESTAMPTZ

## bank_release_records

- id UUID primary key
- release_request_id UUID
- fdr_id UUID
- bank_id UUID
- release_status TEXT
- instruction_reference TEXT
- bank_reference TEXT
- bank_confirmation_date TIMESTAMPTZ nullable
- confirmation_method TEXT
- evidence_document_id UUID nullable
- confirmed_by UUID nullable
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

## fdr_refund_records

- id UUID primary key
- release_request_id UUID
- fdr_id UUID
- expected_amount NUMERIC
- received_amount NUMERIC
- currency TEXT
- refund_status TEXT
- refund_reference TEXT
- refund_date DATE nullable
- payment_mode TEXT nullable
- supporting_document_id UUID nullable
- recorded_by UUID
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

If multiple refund payments are supported, use a dedicated refund transaction table. Do not overwrite previous transactions.

## release_closure_records

- id UUID primary key
- release_request_id UUID
- closure_status TEXT
- reconciliation_status TEXT
- reconciled_by UUID nullable
- reconciled_at TIMESTAMPTZ nullable
- closure_notes TEXT
- closure_evidence_document_id UUID nullable
- closed_by UUID nullable
- closed_at TIMESTAMPTZ nullable
- created_at TIMESTAMPTZ

Use actual existing table names and relationships where applicable.

Add appropriate:

- Foreign keys.
- Check constraints.
- Unique constraints.
- Indexes.
- Institution-scoped relationships.
- RLS policies.
- SQL grants.
- Audit integration.

Review SQL grants and RLS together.

Never rely only on frontend access restrictions.

# 8. REQUEST STATUS MODEL

Implement a validated state machine.

Request statuses:

- draft
- submitted
- preliminary_review
- eligibility_review
- finance_review
- authority_review
- returned_for_correction
- approved
- rejected
- cancelled
- release_initiated
- bank_confirmed
- closed

Do not permit arbitrary status updates.

Every status transition must be validated by the backend.

Record transition history.

Bank release status must be separate:

- not_started
- instruction_prepared
- awaiting_bank
- released
- release_rejected
- unconfirmed

Refund status must be separate:

- not_applicable
- pending
- partially_received
- received
- reconciliation_pending
- reconciled
- disputed

Do not treat request approval, bank release confirmation and refund reconciliation as the same event.

# 9. REVIEW AND APPROVAL WORKFLOW

Implement a configurable multi-stage review process.

Possible stages:

1. Preliminary review.
2. Eligibility review.
3. Finance review.
4. Competent authority review.

Actual stage permissions must follow configured delegation of authority.

Features:

- Assign reviewers.
- Record review decisions.
- Add comments.
- Return for corrections.
- Resubmit corrected requests.
- Record recommendations.
- Record final approval or rejection.
- Preserve the entire review history.

Require separation of duties where configured.

Prevent unauthorized self-approval.

Do not assume that every officer has final release authority.

Use database transactions to prevent conflicting concurrent decisions.

# 10. BANK RELEASE TRACKING

After authorized approval:

- Allow preparation of a release instruction.
- Generate a unique reference.
- Display the instruction for authorized review.
- Provide a simulated bank confirmation interface.
- Record confirmation method.
- Record reference and confirmation date.
- Attach supporting evidence.
- Preserve the original request and approval.

The prototype must clearly identify simulated bank responses.

Do not connect to real banking systems.

Do not initiate actual money transfers.

Do not automatically classify an approved request as bank-confirmed.

# 11. REFUND MANAGEMENT

Allow authorized finance users to:

- Record expected refund amount.
- Record received amount.
- Record refund reference.
- Record refund date.
- Record currency.
- Attach supporting evidence.
- Record partial refund transactions where applicable.
- View refund history.
- Identify discrepancies.
- Submit reconciliation.

Validate non-negative amounts and consistent currencies.

Do not fabricate financial transaction records.

Do not automatically mark a refund as received.

Keep bank release confirmation separate from refund receipt.

# 12. FINAL CLOSURE

Allow closure only when all configured requirements have been satisfied.

Validate:

- Authorized release decision exists.
- Required bank release evidence exists.
- Applicable refund requirements are satisfied.
- Financial reconciliation is recorded where required.
- Required closure evidence is attached.
- Authorized closure decision is recorded.

Do not automatically close a request.

Preserve all original FDR records and related historical information.

Record the closure actor and timestamp.

# 13. FDR LIFECYCLE INTEGRATION

Keep the existing lifecycle, trust-tier and heartbeat models independent.

Rules:

- Creating a release request must not change the FDR lifecycle.
- Reviewing a request must not automatically change the FDR lifecycle.
- Rejection must not delete or alter the original FDR.
- Approval must not automatically mark the FDR released.
- A validated bank release confirmation may trigger an authorized lifecycle transition.
- Final closure must be a separate recorded action.

Preserve:

- Bank attestations.
- Trust tier.
- Heartbeat history.
- Renewal history.
- FDR lineage.
- Existing documents.
- Audit records.

Check renewal lineage and possible conflicting successor relationships before release processing.

Never automatically release a replacement FDR because its predecessor was approved for release.

# 14. BACKEND APIs

Use existing FastAPI architecture and Pydantic schemas.

Implement:

Release requests:
- POST /api/v1/fdrs/{fdr_id}/release-requests
- GET /api/v1/release-requests
- GET /api/v1/release-requests/{id}
- PATCH /api/v1/release-requests/{id}
- POST /api/v1/release-requests/{id}/submit
- POST /api/v1/release-requests/{id}/cancel

Checklist:
- GET /api/v1/release-requests/{id}/checklist
- PATCH /api/v1/release-requests/{id}/checklist/{item_id}

Reviews:
- GET /api/v1/release-requests/{id}/reviews
- POST /api/v1/release-requests/{id}/reviews
- POST /api/v1/release-requests/{id}/return
- POST /api/v1/release-requests/{id}/approve
- POST /api/v1/release-requests/{id}/reject

Bank release:
- POST /api/v1/release-requests/{id}/release-instruction
- GET /api/v1/release-requests/{id}/bank-status
- POST /api/v1/release-requests/{id}/bank-confirmation

Refund:
- POST /api/v1/release-requests/{id}/refunds
- GET /api/v1/release-requests/{id}/refunds
- POST /api/v1/release-requests/{id}/reconciliation

Closure:
- POST /api/v1/release-requests/{id}/close
- GET /api/v1/release-requests/{id}/history

Policy administration:
- GET /api/v1/admin/release-policies
- POST /api/v1/admin/release-policies
- PATCH /api/v1/admin/release-policies/{id}
- POST /api/v1/admin/release-policies/{id}/activate

Enforce authentication, authorization, institution scope and regional scope on every applicable endpoint.

Use server-derived actor IDs.

# 15. FRONTEND IMPLEMENTATION

Follow the existing Government Enterprise design system.

Do not redesign the entire application.

Create:

- ReleaseDashboardPage
- CreateReleaseRequestPage
- ReleaseRequestDetailsPage
- ReleaseEligibilityPage
- ReleaseReviewQueuePage
- ReleaseApprovalPage
- ReleaseInstructionPage
- BankReleaseTrackingPage
- RefundManagementPage
- RefundDetailsPage
- RefundReconciliationPage
- ReleaseClosurePage
- ReleasePolicyManagementPage
- ReleasePolicyEditorPage

Reusable components:

- ReleaseStatusBadge
- ReleaseRequestCard
- FDRReleaseSummary
- EligibilityChecklist
- ReleaseEvidencePanel
- ReviewDecisionPanel
- ApprovalTimeline
- BankReleaseStatusCard
- RefundTransactionTable
- RefundSummaryCard
- ReconciliationPanel
- ClosureConfirmationDialog
- ReleasePolicyEditor

Provide:

- Responsive layouts.
- Loading states.
- Error states.
- Empty states.
- Search and filters.
- Pagination.
- Form validation.
- Confirmation dialogs.
- Role-aware navigation.
- Clear separation of request, bank and refund statuses.

# 16. PHASE 6 OFFICER DASHBOARD INTEGRATION

Integrate with existing officer tasks and priority queue.

Add task categories:

- Release eligibility review.
- Missing release evidence.
- Finance review pending.
- Authority approval pending.
- Bank confirmation overdue.
- Refund pending.
- Refund reconciliation pending.
- Closure review pending.

Use configurable prototype priority rules.

Do not describe prototype priority scores as official AICTE classifications.

Avoid duplicate tasks.

Preserve assignment and escalation history.

# 17. SECURITY REQUIREMENTS

- Enforce RBAC on the backend.
- Enforce institution and region scope.
- Validate every referenced FDR and document.
- Do not trust browser-supplied reviewer or approver IDs.
- Restrict policy changes.
- Restrict final approvals.
- Use transactions for sensitive state transitions.
- Prevent concurrent conflicting decisions.
- Add idempotency protection.
- Keep financial records auditable.
- Use private document storage.
- Use short-lived signed URLs.
- Prevent unauthorized modification of finalized records.
- Preserve historical decisions.
- Never expose service-role secrets to the frontend.

# 18. AUDIT TRAIL

Record:

- Release request created.
- Request submitted.
- Checklist updated.
- Evidence uploaded.
- Reviewer assigned.
- Review submitted.
- Request returned.
- Request approved.
- Request rejected.
- Release instruction prepared.
- Bank confirmation recorded.
- Refund transaction recorded.
- Reconciliation submitted.
- Reconciliation approved.
- Request closed.

Reuse existing audit infrastructure.

Do not allow ordinary users to edit or delete historical audit records.

# 19. TESTING REQUIREMENTS

Write automated tests for:

- Valid release request.
- Invalid FDR reference.
- Unauthorized institution access.
- Conflicting active requests.
- Incomplete checklist.
- Invalid status transitions.
- Unauthorized review.
- Unauthorized approval.
- Self-approval restrictions.
- Concurrent approval attempts.
- Request returned for correction.
- Resubmission.
- Bank confirmation simulation.
- Refund recording.
- Partial refund handling if implemented.
- Reconciliation.
- Closure eligibility.
- Unauthorized closure.
- Duplicate requests.
- Audit event creation.
- FDR lifecycle transitions.
- Preservation of trust tier and historical attestations.
- Renewal and lineage conflicts.

Run regression tests for Phases 1–7.

# 20. STRICT PHASE BOUNDARY

Implement Phase 8 ONLY.

Do not implement:

- Phase 9 final simulation and hackathon benchmarking.
- Real bank integrations.
- Real money transfers.
- Real AICTE integrations.
- Automatic release approvals.
- Automatic refund confirmation.
- Automatic financial reconciliation.
- Automatic closure.
- Legally valid digital signatures unless a separately approved real integration is implemented in a future scope.

All external banking behavior must be clearly labelled as simulated.

# 21. FINAL DELIVERY

After implementation, provide:

1. Repository inspection summary.
2. Files created.
3. Files modified.
4. Database migration details.
5. API endpoint documentation.
6. Frontend route documentation.
7. Role permission matrix.
8. Required environment variables.
9. Exact Windows setup commands.
10. Database migration commands.
11. Backend startup commands.
12. Frontend startup commands.
13. Automated test results.
14. Frontend build results.
15. Regression test results.
16. Known limitations.
17. Phase 8 demo instructions.

Do not claim that a test passed unless it was actually executed.

Work incrementally. Inspect before modifying. Preserve existing functionality. Stop after completing Phase 8.