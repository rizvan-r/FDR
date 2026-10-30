# Phase 7: REST API Specification

## Base URL
`/api/v1`

All endpoints require standard bearer JWT authentication headers:
`Authorization: Bearer <token>`

---

## 1. Migration Subsystem (`/api/v1/migrations`)

### 1.1 Upload Spreadsheet
- **POST** `/api/v1/migrations/upload`
- **Roles**: `system_admin`, `bureau_officer`, `regional_officer`
- **Request**: `multipart/form-data` with `file: UploadFile` (.xlsx or .csv)
- **Response**: `201 Created`
```json
{
  "batch_id": "84824340-9a25-4b13-8a03-91ea83777f98",
  "filename": "sample_migration.xlsx",
  "file_hash_sha256": "4e76a6e76816e02613d2f9d6cbe91a32a67e2a441e8c7924efeb4f01449339e0",
  "status": "uploaded",
  "total_rows": 7,
  "detected_columns": [
    "FDR Number",
    "Institution Code",
    "Bank Name",
    "Branch Name",
    "IFSC Code",
    "Account Number",
    "Principal Amount",
    "Interest Rate (%)",
    "Deposit Date",
    "Maturity Date",
    "Joint Holder AICTE",
    "Auto Renewal Flag",
    "Remarks / Notes"
  ],
  "suggested_mappings": [
    {
      "source_column": "FDR Number",
      "target_field": "fdr_number",
      "confidence": 0.95
    },
    {
      "source_column": "Principal Amount",
      "target_field": "principal_amount",
      "confidence": 0.95
    }
  ]
}
```

### 1.2 List Migration Batches
- **GET** `/api/v1/migrations/batches`
- **Parameters**: `page` (int, default 1), `page_size` (int, default 20), `status` (string, optional)
- **Response**: `200 OK`
```json
{
  "items": [
    {
      "id": "84824340-9a25-4b13-8a03-91ea83777f98",
      "batch_number": "MB-2026-0001",
      "filename": "sample_migration.xlsx",
      "status": "validating",
      "total_rows": 7,
      "valid_rows": 5,
      "invalid_rows": 2,
      "imported_rows": 0,
      "uploaded_at": "2026-10-30T14:10:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

### 1.3 Get Batch Details
- **GET** `/api/v1/migrations/batches/{id}`
- **Response**: `200 OK` (includes column mappings, batch summary, and rows breakdown)

### 1.4 Apply Column Mapping & Validate
- **POST** `/api/v1/migrations/batches/{id}/map-columns`
- **Request Body**:
```json
{
  "mappings": [
    { "source_column": "FDR Number", "target_field": "fdr_number" },
    { "source_column": "Institution Code", "target_field": "institution_code" },
    { "source_column": "Bank Name", "target_field": "bank_name" },
    { "source_column": "Account Number", "target_field": "account_number" },
    { "source_column": "Principal Amount", "target_field": "principal_amount" },
    { "source_column": "Deposit Date", "target_field": "deposit_date" },
    { "source_column": "Maturity Date", "target_field": "maturity_date" }
  ],
  "save_profile_as": "AICTE-Standard-XLSX-V1"
}
```
- **Response**: `200 OK` with counts of `valid_rows` and `invalid_rows`.

### 1.5 Update / Correct a Batch Row
- **PATCH** `/api/v1/migrations/batches/{id}/rows/{row_id}`
- **Request Body**:
```json
{
  "corrected_values": {
    "principal_amount": 500000,
    "remarks": "Corrected negative amount"
  },
  "action": "resolve"
}
```
- **Response**: `200 OK`

### 1.6 Execute Migration (Import to FDR Registry)
- **POST** `/api/v1/migrations/batches/{id}/import`
- **Enforces**: All created FDR records have `trust_tier = 1`, `verification_status = 'institution_declared'`, `lifecycle_status = 'pending'`.
- **Response**: `200 OK`
```json
{
  "batch_id": "84824340-9a25-4b13-8a03-91ea83777f98",
  "status": "imported",
  "imported_count": 5,
  "failed_count": 0,
  "created_fdr_ids": ["f8b417c8-...", "..."],
  "trust_tier": 1
}
```

---

## 2. Compliance Documents Subsystem (`/api/v1/compliance`)

### 2.1 List Statutory Templates
- **GET** `/api/v1/compliance/templates`
- **Response**: `200 OK` with array of active templates.

### 2.2 Create Statutory Template
- **POST** `/api/v1/compliance/templates`
- **Roles**: `system_admin`, `bureau_officer` only
- **Response**: `201 Created`

### 2.3 Generate Compliance Document
- **POST** `/api/v1/compliance/documents/generate`
- **Request Body**:
```json
{
  "template_id": "tmpl-deficit-001",
  "fdr_id": "a1b2c3d4-...",
  "overrides": {
    "officer_name": "Dr. Ramesh Sharma, Regional Officer"
  }
}
```
- **Response**: `201 Created` with generated draft document and initial `v1` version snapshot.

### 2.4 Update Document Draft (Creates Immutable Snapshot)
- **PUT** `/api/v1/compliance/documents/{id}`
- **Request Body**:
```json
{
  "title": "Notice of Fixed Deposit Receipt Deficit - Revision 2",
  "content": "Updated notice body content...",
  "change_summary": "Adjusted deficit cure period from 15 to 30 days"
}
```
- **Response**: `200 OK` with incremented `version` counter and SHA-256 hash.

### 2.5 Submit for Supervisory Review
- **POST** `/api/v1/compliance/documents/{id}/review/submit`
- **Response**: `200 OK` with status `under_review`.

### 2.6 Review Decision (Approve or Return)
- **POST** `/api/v1/compliance/documents/{id}/review/decision`
- **Roles**: `system_admin`, `bureau_officer`, `regional_officer`
- **Request Body**:
```json
{
  "decision": "approve",
  "comments": "Reviewed statutory compliance. Cleared for dispatch."
}
```
- **Response**: `200 OK`

### 2.7 Download PDF
- **GET** `/api/v1/compliance/documents/{id}/pdf`
- **Response**: `200 OK` with binary `application/pdf` stream and attachment filename header.

### 2.8 Mock E-Signature (Simulation Demo)
- **POST** `/api/v1/compliance/documents/{id}/sign`
- **Request Body**:
```json
{
  "signer_name": "S. K. Murthy",
  "designation": "Director (Approval Bureau), AICTE",
  "consent": true
}
```
- **Response**: `200 OK`
```json
{
  "id": "sig-001",
  "document_id": "doc-001",
  "signed_by": "S. K. Murthy",
  "designation": "Director (Approval Bureau), AICTE",
  "is_mock": true,
  "algorithm": "SIMULATED-DEMO-ONLY",
  "disclaimer": "DEMO — NOT A LEGALLY VALID DIGITAL SIGNATURE",
  "signed_at": "2026-10-30T14:15:00Z"
}
```
