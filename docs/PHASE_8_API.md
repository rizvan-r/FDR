# Phase 8 API Reference Documentation

All Phase 8 endpoints are mounted in `backend/app/routers/releases.py` and require authentication headers (`Authorization: Bearer <token>`).

## 1. Release Policy Management (Admin / Bureau Officer)
- `GET /api/v1/admin/release-policies`
  - Returns list of all release policy versions.
- `POST /api/v1/admin/release-policies`
  - Creates a new release policy version with checklist & approval stages.
- `PATCH /api/v1/admin/release-policies/{policy_id}`
  - Updates policy name, description, checklist items, or stages.
- `POST /api/v1/admin/release-policies/{policy_id}/activate`
  - Activates the selected policy version and deactivates all others.

## 2. Release Requests (Institution / Officer / Admin)
- `GET /api/v1/release-requests/stats`
  - Returns dashboard summary KPIs (total requests, draft, under review, approved, bank release pending, refund pending, closed, total released amount).
- `GET /api/v1/release-requests`
  - Query Params: `status`, `institution_id`
  - Returns list of release requests filtered by criteria and scoped by role.
- `POST /api/v1/fdrs/{fdr_id}/release-requests`
  - Creates a new release request for an FDR.
  - Body: `{ "request_reason": string, "policy_version_id"?: string }`
- `GET /api/v1/release-requests/{id}`
  - Returns complete release dossier with FDR details, checklist, reviews, bank release, refund record, and closure record.
- `PATCH /api/v1/release-requests/{id}`
  - Updates a draft release request (request reason).
- `POST /api/v1/release-requests/{id}/submit`
  - Submits draft release request for regulatory review (`status -> preliminary_review`).
- `POST /api/v1/release-requests/{id}/cancel`
  - Cancels a release request (`status -> cancelled`).
- `GET /api/v1/release-requests/{id}/history`
  - Returns immutable audit trail of the request.

## 3. Eligibility Checklist Audit
- `GET /api/v1/release-requests/{id}/checklist`
  - Returns all checklist items for the request.
- `PATCH /api/v1/release-requests/{id}/checklist/{item_id}`
  - Updates review status (`satisfied`, `not_satisfied`, `needs_clarification`, `not_applicable`), comments, or evidence document link. Restricted to regulatory officers.

## 4. Supervisory Reviews & Decision Engine
- `GET /api/v1/release-requests/{id}/reviews`
  - Returns recorded stage reviews.
- `POST /api/v1/release-requests/{id}/reviews`
  - Records stage review (`recommend_approval`, `recommend_rejection`, etc.). Enforces self-approval prohibition.
- `POST /api/v1/release-requests/{id}/return`
  - Returns dossier for institutional correction (`status -> returned_for_correction`).
- `POST /api/v1/release-requests/{id}/approve`
  - Sanctions release approval (`status -> approved`). Requires all mandatory checklist items satisfied. Enforces self-approval prohibition. Does NOT change FDR lifecycle status.
- `POST /api/v1/release-requests/{id}/reject`
  - Rejects release request (`status -> rejected`). Requires mandatory grounds.

## 5. Bank Release Surveillance
- `POST /api/v1/release-requests/{id}/release-instruction`
  - Generates formal release instruction for depository bank.
- `GET /api/v1/release-requests/{id}/bank-status`
  - Returns current bank release record and confirmation status.
- `POST /api/v1/release-requests/{id}/bank-confirmation`
  - Records depository bank confirmation (`released` or `release_rejected`).
  - Upon `'released'`, updates release request status to `'bank_confirmed'` and transitions FDR lifecycle status to `'released'`.

## 6. Refund Ledger & Reconciliation
- `GET /api/v1/release-requests/{id}/refunds`
  - Returns refund ledger with expected amount, received amount, and transaction history.
- `POST /api/v1/release-requests/{id}/refunds`
  - Records refund credit transaction with amount, payment mode, and UTR number.
- `POST /api/v1/release-requests/{id}/reconciliation`
  - Confirms financial reconciliation (`refund_status -> reconciled`).

## 7. Statutory Case Closure
- `POST /api/v1/release-requests/{id}/close`
  - Executes final closure.
  - Pre-requisites: Bank release must be `'released'`, and refund must be reconciled (or verified).
  - Transitions release request status to `'closed'` and FDR lifecycle status to `'closed'`.
