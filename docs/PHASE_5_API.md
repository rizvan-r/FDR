# FDR Monitoring System - Phase 5 REST API Documentation

## Renewal Management & Lineage REST API Specification

### Base Path
All endpoints are mounted under `/api/v1/renewals`.

---

### 1. Renewal Dashboard Statistics

#### `GET /api/v1/renewals/stats/dashboard`
Returns high-level KPI metrics for the renewal operations desk.

- **Security**: Bearer JWT. Authorized roles: all active authenticated users (scoped by user's institution if institution role).
- **Response 200 OK**:
```json
{
  "total_cases": 12,
  "pending_review": 4,
  "under_review": 3,
  "approved_count": 5,
  "rejected_count": 0,
  "awaiting_bank_confirmation": 2,
  "renewed_fdrs_total": 5,
  "active_lineage_chains": 4
}
```

---

### 2. Renewal Cases Management

#### `GET /api/v1/renewals/cases`
List renewal cases with optional filtering and pagination.

- **Query Parameters**:
  - `status` (string, optional): Filter by case status (`draft`, `under_review`, `submitted`, `approved`, `rejected`, `awaiting_bank_confirmation`).
  - `institution_id` (string, optional): Filter by institution UUID.
  - `limit` (integer, default: 50): Number of records.
  - `offset` (integer, default: 0): Pagination offset.
- **Response 200 OK**:
```json
[
  {
    "id": "e3000000-0000-0000-0000-000000000001",
    "case_number": "REN-2026-0001",
    "institution_id": "11111111-1111-1111-1111-111111111111",
    "original_fdr_id": "00000000-0000-0000-0000-000000000001",
    "replacement_fdr_id": "00000000-0000-0000-0000-000000000005",
    "status": "approved",
    "matching_score": 85.00,
    "matching_confidence": "high",
    "matching_signals": {
      "matched_signals": ["Identical bank", "Identical branch", "Matching amount"]
    },
    "matching_discrepancies": [],
    "justification": "Routine 3-year term renewal following deposit maturity.",
    "officer_notes": "All bank renewal documents verified against SBI core system.",
    "rejection_reason": null,
    "created_by": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "submitted_at": "2026-01-20T10:00:00Z",
    "reviewed_by": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "reviewed_at": "2026-01-21T14:30:00Z",
    "created_at": "2026-01-19T09:00:00Z",
    "updated_at": "2026-01-21T14:30:00Z",
    "evidence_count": 2,
    "original_fdr_number": "FDR-2023-SBI-001",
    "replacement_fdr_number": "FDR-2026-SBI-005"
  }
]
```

#### `GET /api/v1/renewals/cases/{case_id}`
Retrieve complete details of a specific renewal case including attached evidence files.

- **Response 200 OK**: Complete `RenewalCaseDetailResponse` object with nested `evidence` list.
- **Response 404 Not Found**: Case does not exist.

#### `POST /api/v1/renewals/cases`
Create a new draft renewal case.

- **Request Body**:
```json
{
  "institution_id": "11111111-1111-1111-1111-111111111111",
  "original_fdr_id": "00000000-0000-0000-0000-000000000001",
  "replacement_fdr_id": "00000000-0000-0000-0000-000000000005",
  "justification": "Maturity rollover into 3-year fixed deposit"
}
```
- **Response 200 OK**: Newly created `RenewalCaseResponse` in `draft` status.
- **Errors**:
  - `400 Bad Request`: If `original_fdr_id` and `replacement_fdr_id` belong to different institutions.

#### `PUT /api/v1/renewals/cases/{case_id}`
Update details of a draft case.

- **Rules**: Case must be in `draft` status. Updates to `submitted`, `approved`, or `rejected` cases are prohibited (`400 Bad Request`).

#### `POST /api/v1/renewals/cases/{case_id}/submit`
Transition case status from `draft` to `submitted`.

- **Rules**: Requires valid `original_fdr_id` and `replacement_fdr_id`. Computes advisory matching signals upon submission.

---

### 3. Candidate Matching

#### `POST /api/v1/renewals/cases/matching/candidates`
Advisory search endpoint ranking potential replacement FDRs for a given predecessor FDR.

- **Request Body**:
```json
{
  "original_fdr_id": "00000000-0000-0000-0000-000000000001",
  "candidate_fdr_id": "00000000-0000-0000-0000-000000000005"
}
```
*Note*: If `candidate_fdr_id` is omitted, the engine scans all available candidate FDRs within the institution.
- **Response 200 OK**:
```json
{
  "original_fdr_id": "00000000-0000-0000-0000-000000000001",
  "candidates": [
    {
      "candidate_fdr_id": "00000000-0000-0000-0000-000000000005",
      "candidate_fdr_number": "FDR-2026-SBI-005",
      "score": 85.00,
      "confidence": "high",
      "matched_signals": ["Identical issuing bank", "Identical branch"],
      "discrepancies": ["No explicit cross-reference in remarks"],
      "signals_breakdown": {
        "bank_match": 25.0,
        "branch_match": 15.0,
        "amount_match": 25.0,
        "chronology_match": 15.0,
        "lien_match": 10.0,
        "reference_match": 0.0
      }
    }
  ],
  "disclaimer": "Matching evaluation is strictly advisory and does not commit approval."
}
```

---

### 4. Renewal Evidence

#### `POST /api/v1/renewals/cases/{case_id}/evidence`
Upload and attach a supporting document to a renewal case.

- **Request Body**:
```json
{
  "document_type": "bank_renewal_certificate",
  "file_name": "sbi_renewal_cert_2026.pdf",
  "file_url": "https://storage.fdr-monitoring.gov.in/evidence/sbi_cert.pdf",
  "file_size_bytes": 1048576,
  "mime_type": "application/pdf",
  "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
- **Rules**: `mime_type` must be an allowed format (`application/pdf`, `image/png`, `image/jpeg`). Invalid MIME types return `400 Bad Request`.

---

### 5. Approval & Rejection

#### `POST /api/v1/renewals/cases/{case_id}/approve`
Atomically approve a renewal case, register the lineage edge, and transition the original FDR to `renewed`.

- **Security**: Restricted to roles `regional_officer`, `regulation_officer`, and `admin`.
- **Request Body**:
```json
{
  "officer_notes": "Verified against SBI Nodal Officer direct attestation.",
  "relationship_type": "renewal"
}
```
- **Guarantees**:
  - Executes atomic state transition.
  - Verifies replacement FDR trust tier $\ge 2$ or bank confirmation.
  - Verifies cycle-free graph property.
  - Verifies no conflicting predecessor exists for replacement FDR.
- **Errors**:
  - `400 Bad Request`: Replacement FDR fails Trust Tier $\ge 2$, or cyclic link detected, or predecessor already registered, or missing evidence.
  - `403 Forbidden`: User role unauthorized to approve.

#### `POST /api/v1/renewals/cases/{case_id}/reject`
Reject a renewal case.

- **Request Body**:
```json
{
  "rejection_reason": "Deposit amount INR 4,000,000 is lower than mandatory regulatory minimum of INR 5,000,000."
}
```
- **Rules**: `rejection_reason` is strictly required. Attempting rejection with an empty or whitespace-only reason returns `400 Bad Request`.

---

### 6. Lineage Graph

#### `GET /api/v1/renewals/lineage/{fdr_id}`
Retrieve the full provenance graph (ancestors, queried node, descendants) for an FDR.

- **Response 200 OK**:
```json
{
  "target_fdr_id": "00000000-0000-0000-0000-000000000001",
  "nodes": [
    {
      "fdr_id": "00000000-0000-0000-0000-000000000001",
      "fdr_number": "FDR-2023-SBI-001",
      "generation": 0,
      "lifecycle_status": "renewed",
      "amount": 10000000.0,
      "trust_tier": 3,
      "heartbeat_status": "alive"
    },
    {
      "fdr_id": "00000000-0000-0000-0000-000000000005",
      "fdr_number": "FDR-2026-SBI-005",
      "generation": 1,
      "lifecycle_status": "active",
      "amount": 10000000.0,
      "trust_tier": 2,
      "heartbeat_status": "alive"
    }
  ],
  "edges": [
    {
      "id": "lineage-001",
      "parent_fdr_id": "00000000-0000-0000-0000-000000000001",
      "child_fdr_id": "00000000-0000-0000-0000-000000000005",
      "relationship_type": "renewal",
      "created_at": "2026-01-21T14:30:00Z"
    }
  ],
  "root_fdr_id": "00000000-0000-0000-0000-000000000001",
  "latest_active_fdr_id": "00000000-0000-0000-0000-000000000005",
  "total_generations": 2
}
```
