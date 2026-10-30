# FDR-Chain — Phase 5: Renewal Management and FDR Lineage

Act as a senior full-stack engineer working on FDR-Chain, a government-grade FDR Security Deposit Management Portal for the AICTE regulatory workflow.

Implement Phase 5: Renewal Management and FDR Lineage in the existing repository.

## 1. Existing technology stack

Preserve the existing stack:

- React + Vite + TypeScript
- Tailwind CSS
- Existing UI component library
- Python FastAPI
- Supabase PostgreSQL
- Supabase Auth
- Existing RBAC and RLS
- Private Supabase Storage
- Existing Phase 3 Tier 2 and Tier 3 bank verification
- Ed25519 digital signature verification
- Existing Phase 4 heartbeat monitoring and alerting

Do not introduce MongoDB, Firebase, or another database.

## 2. Mandatory repository inspection

Before coding:

1. Inspect the complete frontend and backend structures.
2. Inspect all existing database migrations.
3. Inspect the actual `fdrs`, `documents`, and `fdr_events` schemas.
4. Inspect Phase 3 bank verification and attestation implementation.
5. Inspect Phase 4 heartbeat monitoring and maturity alerts.
6. Inspect authentication, role checks, RLS, and institution/region scoping.
7. Inspect the existing audit log implementation.
8. Inspect existing document upload and private storage services.
9. Identify reusable pages, components, API services, and types.

Prepare a brief assessment of what exists and what must be added.

Do not assume earlier implementation prompts were executed successfully. Verify the actual code.

Preserve all working Phase 1–4 features.

## 3. Phase 5 objectives

Implement:

- Renewal case creation.
- Replacement FDR registration or selection.
- Renewal matching suggestions.
- Supporting evidence management.
- Bank confirmation integration.
- Renewal review and approval.
- Renewal rejection with reason.
- Permanent FDR lineage relationships.
- FDR lineage visualization.
- Complete renewal history.
- Renewal dashboard and officer queue.
- Audit events and tests.

Do not start Phase 6.

## 4. Database migration

Create a new Phase 5 migration. Do not recreate existing tables.

### A. renewal_cases

Create:

- id UUID primary key
- parent_fdr_id UUID foreign key to fdrs
- proposed_fdr_id UUID nullable foreign key to fdrs
- institution_id UUID foreign key
- bank_id UUID foreign key
- case_status
- match_score numeric nullable
- match_explanation JSONB nullable
- submitted_by UUID
- reviewed_by UUID nullable
- reviewed_at TIMESTAMPTZ nullable
- decision_note TEXT nullable
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

Allowed statuses:

- draft
- submitted
- matching
- evidence_pending
- bank_confirmed
- under_review
- approved
- rejected
- cancelled

Add appropriate constraints, indexes, and foreign keys.

Ensure the original and proposed FDR belong to the same institution. Validate bank relationships according to the actual project schema.

### B. fdr_lineage

Create:

- id UUID primary key
- parent_fdr_id UUID foreign key to fdrs
- child_fdr_id UUID foreign key to fdrs
- renewal_case_id UUID foreign key to renewal_cases
- relationship_type
- approved_by UUID
- approved_at TIMESTAMPTZ
- evidence_reference JSONB or appropriate reference
- created_at TIMESTAMPTZ

Allowed relationship types:

- renewal
- replacement

Add constraints:

- Parent and child cannot be the same.
- No duplicate parent-child relationship.
- A child cannot have conflicting predecessor links.
- Parent and child must belong to the same institution.
- Only approved renewal cases can create lineage links.
- Prevent lineage cycles.
- Preserve existing relationships permanently.

Use database-level transactional safeguards for lineage creation.

A parent may have multiple successor records only when the workflow and evidence explicitly justify it. Do not automatically create multiple children.

### C. renewal_evidence

Create:

- id UUID primary key
- renewal_case_id UUID foreign key
- document_id UUID foreign key to existing documents
- evidence_type
- verification_status
- verified_by UUID nullable
- verified_at TIMESTAMPTZ nullable
- remarks TEXT nullable
- created_at TIMESTAMPTZ

Use the existing private Supabase Storage bucket and document upload service.

Do not duplicate document binary data.

### D. FDR events

Extend the existing event system with:

- renewal_case_created
- renewal_submitted
- replacement_suggested
- replacement_fdr_registered
- renewal_bank_confirmed
- renewal_approved
- renewal_rejected
- lineage_created
- lineage_disputed

Follow the existing audit/event schema. Do not replace it with a new unrelated event system.

## 5. Renewal case creation

Allow an authorized institution user to:

1. Select an existing original FDR.
2. Enter replacement FDR details or select an existing candidate FDR.
3. Add a renewal reference, where available.
4. Upload supporting evidence.
5. Save as draft.
6. Submit for review.

Validate institution ownership on the backend.

Do not let the client choose an arbitrary institution ID to create records for another institution.

Do not change the original FDR lifecycle status when a renewal case is first created.

## 6. Renewal matching service

Implement a candidate matching service.

Use matching signals such as:

- Institution identity.
- Bank identity.
- Branch/IFSC.
- Original FDR number and renewal reference.
- Amount similarity.
- Issue date.
- Maturity date.
- Lien details.
- Supporting evidence.

Return:

- Candidate FDR ID.
- Matching score.
- Matching factors.
- Mismatched fields.
- Explanation of why it was suggested.

Use a transparent weighted scoring system.

Keep matching logic configurable and testable.

IMPORTANT:

- Matching is advisory only.
- A high score must never create a lineage relationship.
- Matching must never approve a renewal.
- The system must not change lifecycle status because of matching.
- Officers must be able to reject an incorrect match.

## 7. Bank verification integration

Reuse existing Phase 3 verification services.

For a replacement FDR:

- Require its own bank verification.
- Support Tier 2 confirmation.
- Support Tier 3 Ed25519 signed attestation.
- Validate bank identity and FDR details.
- Validate key validity and revocation.
- Validate nonce and replay protection.
- Validate signed payload against the replacement FDR.
- Preserve bank attestation evidence.

Never copy the original FDR's trust tier, signature, or bank attestation onto the replacement FDR.

A bank confirmation must refer to the correct proposed replacement and renewal case.

If the existing Phase 3 implementation does not support this association, extend it safely without weakening its security controls.

## 8. Evidence management

Use existing private document storage.

Support appropriate evidence categories:

- Replacement FDR copy.
- Bank renewal advice.
- Original FDR closure or maturity confirmation.
- Bank pledge confirmation.
- Other supporting document.

Requirements:

- Private bucket only.
- Server-generated storage paths.
- Authorized access checks.
- Short-lived signed URLs.
- MIME type and file-size validation.
- Document metadata stored in PostgreSQL.
- Evidence review status.
- No public document URLs.

Do not automatically mark uploaded documents as verified.

## 9. Renewal review and approval

Create a secure approval service.

An authorized officer must review:

- Original FDR.
- Replacement FDR.
- Institution.
- Bank.
- Branch.
- Amount.
- Issue date.
- Maturity date.
- Lien in favour.
- Bank attestation.
- Supporting documents.
- Matching explanation.
- Existing heartbeat and historical status.

Display field differences clearly.

A difference does not automatically mean rejection. The reviewer must evaluate it.

### Approval transaction

Approval must happen in one database transaction.

Validate:

1. User authorization.
2. Institution and region scope.
3. Renewal case status.
4. Original FDR existence.
5. Replacement FDR existence.
6. Same-institution relationship.
7. Bank confirmation evidence.
8. Evidence review completion.
9. No conflicting predecessor link.
10. No lineage cycle.
11. Original FDR is eligible for the approved transition under configured project rules.

Then:

- Mark the renewal case approved.
- Create the lineage relationship.
- Update the original FDR lifecycle status to renewed where appropriate.
- Preserve the replacement FDR's independently determined lifecycle status.
- Record the approving officer and timestamp.
- Write audit events for both FDR records.
- Commit the transaction.

If any operation fails, roll back the entire transaction.

### Rejection

Require a rejection reason.

Mark the case rejected, record the reviewer, timestamp, and explanation.

Do not delete the original or replacement FDR.

Do not create a lineage link for rejected cases.

## 10. Lineage integrity

Implement a dedicated lineage service.

Requirements:

- Retrieve the complete ancestor and descendant chain.
- Prevent cycles.
- Preserve old FDR records.
- Preserve previous attestations.
- Preserve heartbeat history.
- Preserve documents and audit events.
- Prevent unauthorized edits or deletion.
- Handle missing or disputed links explicitly.

Use a recursive PostgreSQL query or an equivalent safe backend service for lineage retrieval.

Enforce cycle detection inside the trusted transaction, not only in React.

Support a clear response for FDRs without a predecessor or successor.

Do not assume every FDR must have a replacement.

## 11. Backend APIs

Implement:

- POST `/api/v1/fdrs/{id}/renewals`
- GET `/api/v1/renewals`
- GET `/api/v1/renewals/{id}`
- PATCH `/api/v1/renewals/{id}`
- POST `/api/v1/renewals/{id}/submit`
- POST `/api/v1/renewals/{id}/match`
- GET `/api/v1/renewals/{id}/matches`
- POST `/api/v1/renewals/{id}/evidence`
- POST `/api/v1/renewals/{id}/approve`
- POST `/api/v1/renewals/{id}/reject`
- GET `/api/v1/fdrs/{id}/lineage`
- GET `/api/v1/fdrs/{id}/renewals`

Use Pydantic request and response models.

Enforce:

- Supabase JWT validation.
- Backend RBAC.
- Institution scoping.
- Bank scoping.
- Region scoping.
- Ownership checks.
- Input validation.
- Consistent error responses.
- Audit events for sensitive operations.

Never trust a client-supplied approval status or lineage relationship.

## 12. Frontend pages

Follow the existing Government Enterprise design system.

Do not redesign unrelated Phase 1–4 pages.

### A. RenewalDashboardPage

Show:

- Total renewal cases.
- Draft cases.
- Submitted cases.
- Awaiting bank confirmation.
- Under review.
- Approved.
- Rejected.
- Upcoming FDR maturities.
- Officer review workload.

Use real backend data.

### B. CreateRenewalPage

Create a clear workflow:

1. Select original FDR.
2. Enter replacement details or select an existing candidate.
3. Upload evidence.
4. Review entered details.
5. Save or submit.

### C. RenewalReviewPage

Display original and replacement FDR side by side.

Highlight differences in:

- FDR number.
- Bank.
- Branch.
- Amount.
- Issue date.
- Maturity date.
- Lien.
- Trust tier.
- Heartbeat status.

Show bank attestation and evidence review information.

Provide authorized approval and rejection controls.

Require a reason for rejection.

### D. RenewalApprovalQueuePage

Create a filterable officer queue.

Filters:

- Case status.
- Institution.
- Bank.
- Region.
- Submission date.
- Maturity date.

### E. FDRLineagePage

Create a lineage explorer.

Display:

- Original FDR.
- Replacement FDR.
- Relationship type.
- Approval date.
- Approving officer.
- Amount and date differences.
- Current lifecycle status.
- Trust tier.
- Heartbeat status.

Allow users to open authorized FDR detail pages.

Support long chains without losing readability.

### F. Reusable components

Create or reuse:

- RenewalStatusBadge
- RenewalCaseCard
- FDRComparisonPanel
- RenewalEvidenceList
- RenewalApprovalPanel
- RenewalMatchScore
- FDRLineageTree
- LineageTimeline
- RenewalHistoryTable

Include loading, empty, error, and responsive states.

## 13. Role-based access

Use existing roles:

1. Institution User
2. Bank Nodal Officer
3. Regional Officer
4. Regulation Bureau Officer / Head
5. Finance / Accounts Officer
6. System Administrator

Apply actual existing permissions and project policy.

Institution users can submit and view their institution's cases.

Bank officers can view and confirm requests belonging to their bank.

Authorized officers can review and approve within their permitted scope.

Finance officers can access relevant financial records and authorized renewal information.

Administrators can manage configuration but should not bypass required approval controls.

Do not rely on frontend visibility restrictions for security.

## 14. Testing requirements

Create tests for:

### Renewal cases

- Create draft.
- Submit case.
- Edit draft.
- Reject unauthorized submission.
- Prevent changes after final decision.
- Prevent cross-institution references.

### Matching

- Exact FDR reference.
- Same institution and bank.
- Amount differences.
- Branch differences.
- Date differences.
- Multiple candidates.
- No candidate.
- Low matching score.
- High matching score without automatic approval.

### Bank verification

- Valid Tier 2 confirmation.
- Valid Tier 3 signature.
- Invalid signature.
- Expired key.
- Revoked key.
- Incorrect bank.
- Incorrect FDR.
- Replayed nonce.
- Incorrect renewal case association.

### Approval

- Valid approval.
- Missing evidence.
- Missing bank confirmation.
- Unauthorized approval.
- Duplicate approval.
- Conflicting predecessor.
- Cycle prevention.
- Transaction rollback.
- Rejection with reason.
- Original FDR historical data preserved.

### Lineage

- One parent and one child.
- Multi-generation chain.
- Multiple successors only under allowed policy.
- No duplicate edges.
- No self-links.
- Cycle prevention.
- Complete ancestor retrieval.
- Complete descendant retrieval.
- Institution isolation.

### Regression

- Existing Phase 1 tests.
- Existing Phase 2 tests.
- Existing Phase 3 tests.
- Existing Phase 4 tests.
- Frontend production build.

Do not claim tests passed unless they were executed.

## 15. Documentation

Create:

- `docs/PHASE_5_RENEWAL_ARCHITECTURE.md`
- `docs/PHASE_5_DATABASE.md`
- `docs/PHASE_5_MATCHING.md`
- `docs/PHASE_5_LINEAGE.md`
- `docs/PHASE_5_API.md`
- `docs/PHASE_5_TESTING.md`

Document migrations, approval rules, lineage integrity, matching behavior, API usage, security, and Windows development commands.

## 16. Strict boundaries

Implement Phase 5 only.

Do not implement:

- Phase 6 officer priority queue enhancements beyond the renewal review queue required here.
- New unrelated analytics.
- Automated release/refund approvals.
- Automatic financial decisions.
- Real bank integrations.
- Real AICTE production integrations.
- Blockchain claims or unnecessary distributed ledger infrastructure.
- Microservices unless already present and genuinely required.

Clearly identify simulated bank interactions.

Do not invent official AICTE renewal rules. Keep policy decisions configurable and subject to authorized institutional/regulatory review.

## 17. Completion report

At the end, report:

1. Existing repository findings.
2. New files.
3. Modified files.
4. Database migration details.
5. New APIs.
6. New frontend pages.
7. Matching algorithm and scoring explanation.
8. Approval and lineage security.
9. Tests actually executed and their results.
10. Known limitations.
11. Windows commands to run the feature.
12. Manual end-to-end verification steps.

STOP after Phase 5. Do not start Phase 6 until explicitly instructed.