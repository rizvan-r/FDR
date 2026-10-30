# FDR-CHAIN — PHASE 7 IMPLEMENTATION PROMPT
## Legacy Data Migration & Compliance Document Management

Act as a senior full-stack engineer, software architect, database engineer, and security-focused developer.

Implement **Phase 7 only** of my existing FDR-Chain project.

FDR-Chain is a Government Enterprise FDR Security Deposit Management Portal for the AICTE regulatory workflow.

## 1. Existing technology stack — DO NOT CHANGE

- Frontend: React + Vite + TypeScript
- Backend: Python FastAPI
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth
- File storage: Private Supabase Storage
- UI: Government Enterprise design system
- API communication: Axios or the existing API client
- Database migrations: Follow the existing migration approach.

Do not replace Supabase with MongoDB, Firebase, or another database.

## 2. Mandatory first step: inspect the existing project

Before writing code:

1. Inspect the complete existing frontend and backend structure.
2. Inspect the current database migrations and schema.
3. Inspect existing authentication, role management, RBAC, RLS and authorization helpers.
4. Inspect existing FDR, document, audit and institution models.
5. Inspect existing API conventions and frontend design components.
6. Identify which Phase 1–6 features are already implemented.
7. Identify missing tables, columns and functionality.
8. Prepare a short implementation plan based on the actual repository.

Do not assume earlier phase prompts were implemented successfully.

Preserve existing code and working functionality. Reuse existing components, services, models and helpers instead of creating duplicates.

Do not overwrite or recreate existing tables without checking their actual definitions.

## 3. Phase 7 scope

Implement two modules:

### MODULE A — LEGACY DATA MIGRATION

Create a complete Excel/CSV import workflow.

Required functionality:

- Upload CSV and XLSX files.
- Validate file type, file size and row count.
- Parse spreadsheet contents using backend services.
- Display a spreadsheet preview.
- Allow manual source-column mapping.
- Save reusable column mapping profiles.
- Normalize spreadsheet values.
- Validate FDR data.
- Detect exact duplicates.
- Suggest possible duplicate records.
- Match institution and bank records.
- Support manual resolution of ambiguous matches.
- Create a row-level validation report.
- Provide a human-review queue.
- Allow authorized users to correct or exclude problematic rows.
- Allow users to confirm eligible imports.
- Generate batch-level import reports.
- Support safe retries without duplicate FDR creation.

Supported fields:

- Institution
- Bank
- Branch
- FDR number
- Amount
- Currency
- Issue date
- Maturity date
- Interest rate
- Lien in favour
- Remarks

Allow users to map different spreadsheet column names to these fields.

### MODULE B — COMPLIANCE DOCUMENT MANAGEMENT

Implement a template-driven document workflow.

Required functionality:

- Create and manage compliance templates.
- Generate pre-filled letters from FDR and institution information.
- Preview generated letters.
- Edit draft content.
- Save drafts.
- Submit documents for review.
- Approve or return documents with comments.
- Generate final PDF documents.
- Maintain document versions.
- Store documents privately.
- Provide document history and audit logs.
- Implement a clearly labelled mock e-sign demonstration.

Initial templates:

1. FDR details confirmation letter.
2. Bank verification request letter.
3. FDR renewal reminder letter.
4. Missing document notification.
5. Compliance clarification letter.
6. Institution-level FDR summary report.

Templates must be configurable by authorized administrators.

Do not invent official AICTE regulatory wording. Use clearly labelled prototype sample templates until approved wording is supplied.

## 4. Database implementation

Create a new Phase 7 migration after inspecting existing schema.

Reuse existing tables wherever possible.

Create or extend the following logical entities.

### migration_batches

Fields:

- id UUID primary key
- institution_id UUID
- uploaded_by UUID
- file_name TEXT
- storage_path TEXT
- file_type TEXT
- batch_status TEXT
- total_rows INTEGER
- valid_rows INTEGER
- invalid_rows INTEGER
- imported_rows INTEGER
- skipped_rows INTEGER
- created_at TIMESTAMPTZ
- completed_at TIMESTAMPTZ

### migration_column_mappings

Fields:

- id UUID primary key
- batch_id UUID
- source_column TEXT
- target_field TEXT
- mapping_profile_name TEXT
- created_by UUID
- created_at TIMESTAMPTZ

### migration_rows

Fields:

- id UUID primary key
- batch_id UUID
- row_number INTEGER
- source_data JSONB
- normalized_data JSONB
- validation_status TEXT
- validation_errors JSONB
- duplicate_candidates JSONB
- matched_institution_id UUID
- matched_bank_id UUID
- matched_branch_id UUID
- reviewed_by UUID
- review_note TEXT
- imported_fdr_id UUID
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

### migration_mapping_profiles

Fields:

- id UUID primary key
- institution_id UUID nullable
- profile_name TEXT
- column_mapping JSONB
- created_by UUID
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

### compliance_templates

Fields:

- id UUID primary key
- template_name TEXT
- template_type TEXT
- description TEXT
- template_content TEXT
- version INTEGER
- is_active BOOLEAN
- created_by UUID
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

### compliance_documents

Fields:

- id UUID primary key
- institution_id UUID
- fdr_id UUID nullable
- template_id UUID
- document_title TEXT
- document_type TEXT
- document_status TEXT
- current_version INTEGER
- created_by UUID
- reviewed_by UUID nullable
- approved_by UUID nullable
- approved_at TIMESTAMPTZ nullable
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

### compliance_document_versions

Fields:

- id UUID primary key
- compliance_document_id UUID
- version_number INTEGER
- content_snapshot JSONB
- storage_path TEXT
- content_hash TEXT
- created_by UUID
- created_at TIMESTAMPTZ

### document_reviews

Fields:

- id UUID primary key
- compliance_document_id UUID
- version_id UUID
- reviewer_id UUID
- review_status TEXT
- comments TEXT
- reviewed_at TIMESTAMPTZ

### mock_signature_records

Fields:

- id UUID primary key
- compliance_document_id UUID
- version_id UUID
- signer_user_id UUID
- signer_display_name TEXT
- signature_reference TEXT
- signature_status TEXT
- signed_at TIMESTAMPTZ
- disclaimer TEXT
- created_at TIMESTAMPTZ

Database requirements:

- UUID primary keys.
- Appropriate foreign keys.
- Required indexes.
- Check constraints for statuses and numeric fields.
- Unique version number per document.
- Prevent duplicate source-column mappings within a batch.
- Institution-scoped document relationships.
- Appropriate RLS policies and SQL grants.
- Append-only audit history where appropriate.
- Prevent unauthorized direct browser writes to sensitive migration and approval fields.

Review actual existing table names and relationships before implementing these definitions. Adjust them to fit the existing database without creating duplicate entities.

## 5. Migration validation and import logic

Create a dedicated backend service.

Validation requirements:

- Required FDR number.
- Positive amount.
- Valid issue date.
- Valid maturity date.
- Maturity date cannot precede issue date.
- Valid bank and institution mapping.
- Supported currency.
- Valid interest rate if supplied.

Duplicate detection:

- Exact FDR number within the appropriate scope.
- Normalized FDR number comparison.
- Bank and institution comparison.
- Possible duplicate suggestions.

Fuzzy matching must be advisory only.

Never silently merge, overwrite or delete existing FDR records.

Import rules:

- User must explicitly confirm the import.
- Only eligible and reviewed rows can be imported.
- Import must be idempotent.
- Use transactions where practical.
- Preserve source data.
- Record each row's result.
- Prevent repeated requests from creating duplicate FDRs.
- Provide safe failure and retry handling.

Most importantly:

**Every FDR created through legacy migration must start at Tier 1.**

Initial imported record state should follow the existing Phase 2 conventions:

- trust_tier = 1
- verification_status = institution_declared
- heartbeat_status = not_started, unless the existing schema has a different valid initial state
- lifecycle_status must follow the existing FDR creation convention.

Do not automatically upgrade imported records to Tier 2 or Tier 3.

Do not fabricate bank attestations, signatures or heartbeat history.

## 6. Compliance document workflow

Implement these document statuses, adapting to existing conventions if necessary:

- draft
- submitted_for_review
- under_review
- returned_for_correction
- approved
- finalized
- archived

Workflow:

1. Authorized user selects an institution or FDR.
2. User selects a template.
3. Backend retrieves permitted data.
4. Backend generates a pre-filled draft.
5. User previews and edits the draft.
6. User submits it for review.
7. Authorized reviewer approves or returns it.
8. Approved content is converted into a PDF.
9. Final version is stored privately.
10. Document version and actions are recorded in audit history.

Enforce role and scope checks on every action.

Do not trust reviewer or approver IDs submitted by the browser.

Preserve previous document versions. Never silently overwrite finalized content.

## 7. Mock e-sign workflow

Implement a demonstration only.

When an authorized user selects mock signing:

- Verify that the document is eligible for the demonstration.
- Record the authenticated user.
- Record the display name and timestamp.
- Generate a unique mock signature reference.
- Record a clear simulation disclaimer.
- Create a new immutable document version where appropriate.
- Store the mock signature event in the database.
- Display a visible disclaimer on the generated document.

Mandatory disclaimer:

"DEMO — NOT A LEGALLY VALID DIGITAL SIGNATURE"

Do not claim that this implements Aadhaar eSign, DSC, legally valid signing or a real digital signature.

## 8. Backend APIs

Implement APIs using the existing FastAPI router conventions.

### Migration APIs

- POST /api/v1/migrations/upload
- GET /api/v1/migrations
- GET /api/v1/migrations/{id}
- GET /api/v1/migrations/{id}/preview
- POST /api/v1/migrations/{id}/mapping
- POST /api/v1/migrations/{id}/validate
- GET /api/v1/migrations/{id}/errors
- POST /api/v1/migrations/{id}/rows/{row_id}/review
- POST /api/v1/migrations/{id}/import
- POST /api/v1/migrations/{id}/cancel
- GET /api/v1/migrations/{id}/report

### Compliance APIs

- GET /api/v1/compliance/templates
- POST /api/v1/compliance/templates
- PATCH /api/v1/compliance/templates/{id}
- POST /api/v1/compliance/documents/generate
- GET /api/v1/compliance/documents
- GET /api/v1/compliance/documents/{id}
- POST /api/v1/compliance/documents/{id}/submit-review
- POST /api/v1/compliance/documents/{id}/review
- POST /api/v1/compliance/documents/{id}/finalize
- POST /api/v1/compliance/documents/{id}/mock-sign
- GET /api/v1/compliance/documents/{id}/versions

Use Pydantic request and response schemas.

Add appropriate error handling, validation, pagination and authorization.

## 9. Frontend implementation

Use the existing Government Enterprise design system.

Do not redesign the entire application.

### Migration pages

- MigrationDashboardPage
- MigrationUploadPage
- MigrationMappingPage
- MigrationPreviewPage
- MigrationValidationPage
- MigrationReviewQueuePage
- MigrationBatchDetailsPage
- MigrationReportPage

### Compliance pages

- ComplianceDashboardPage
- ComplianceTemplatePage
- CreateComplianceDocumentPage
- ComplianceDocumentDetailsPage
- DocumentReviewPage
- DocumentVersionHistoryPage
- MockSignaturePage

### Reusable components

- FileUploadZone
- MigrationStatusBadge
- ColumnMappingTable
- ImportPreviewTable
- ValidationErrorPanel
- DuplicateMatchPanel
- MigrationProgress
- ImportSummaryCard
- ComplianceTemplateCard
- LetterEditor
- DocumentPreview
- ReviewDecisionPanel
- DocumentVersionTimeline
- MockSignaturePanel

Frontend requirements:

- Responsive layouts.
- Loading and error states.
- Empty states.
- Confirmation dialogs for imports and approvals.
- Clear validation messages.
- Search and filters.
- Pagination for large tables.
- Role-aware navigation.
- Accessible forms and controls.

Frontend visibility is not authorization. The backend must enforce all permissions.

## 10. File handling and security

- Store source spreadsheets in private Supabase Storage.
- Store final PDFs in private Supabase Storage.
- Generate server-controlled storage paths.
- Use short-lived signed URLs after authorization.
- Validate file content, type and size.
- Set configurable upload and row-count limits.
- Never execute spreadsheet macros or formulas.
- Prevent spreadsheet formula injection when exporting data.
- Do not log confidential spreadsheet contents.
- Protect against unauthorized file access.
- Avoid public storage buckets.
- Clean up orphaned files after failed operations where possible.

## 11. Audit trail

Record important events:

- Migration batch uploaded.
- Column mapping changed.
- Validation completed.
- Row reviewed.
- Row excluded.
- Import confirmed.
- FDR created from migration.
- Compliance template created or modified.
- Document generated.
- Document edited.
- Document submitted for review.
- Document approved or returned.
- PDF finalized.
- Mock signature recorded.

Reuse the existing audit infrastructure if present.

Never allow ordinary users to edit or delete historical audit events.

## 12. Testing requirements

Create automated tests for:

### Migration

- Valid CSV upload.
- Valid XLSX upload.
- Invalid file type.
- Empty spreadsheet.
- Malformed spreadsheet.
- Missing required fields.
- Invalid dates.
- Invalid amounts.
- Duplicate FDR number.
- Ambiguous institution match.
- Unauthorized institution access.
- Row correction and review.
- Successful import.
- Partial import.
- Failed import.
- Duplicate import request.
- Tier 1 initial state.

### Compliance

- Template creation.
- Template permission checks.
- Document generation.
- Missing template variables.
- Draft editing.
- Review submission.
- Authorized approval.
- Unauthorized approval.
- Return for correction.
- PDF generation.
- Private file access.
- Version history.
- Mock signature disclaimer.
- Audit event creation.

### Regression

Test the existing Phase 1–6 functionality, especially:

- Authentication and roles.
- FDR repository.
- Private document access.
- Tier 2 and Tier 3 verification.
- Heartbeat monitoring.
- Renewal and lineage.
- Officer priority queue.

Do not break existing features.

## 13. Documentation

Update README with:

- Phase 7 overview.
- New dependencies.
- Environment variables.
- Database migration instructions.
- Storage bucket configuration.
- Backend startup commands.
- Frontend startup commands.
- Spreadsheet import workflow.
- Compliance document workflow.
- Mock signature limitations.
- Testing instructions.
- Demo instructions.

Provide example CSV and XLSX files using synthetic data only.

Do not use real institutional financial records in demo fixtures.

## 14. Strict phase boundary

Implement Phase 7 ONLY.

Do not implement:

- Phase 8 release/refund workflow.
- Real bank integrations.
- Real AICTE integrations.
- Real legally valid e-signing.
- Automatic FDR approval.
- Automatic trust-tier upgrades.
- Automatic merging of duplicate FDR records.

OCR may be added only as an optional assistance feature if the core workflow is complete. OCR output must always be reviewed by a human before it becomes trusted data.

## 15. Final delivery requirements

After implementation:

1. List all files created.
2. List all existing files modified.
3. Explain every database migration.
4. Explain new API endpoints.
5. Explain frontend routes and pages.
6. Explain role permissions.
7. Provide required environment variables.
8. Provide exact Windows setup and run commands.
9. Provide database migration commands.
10. Run backend tests.
11. Run frontend build and type checks.
12. Run regression tests.
13. Report actual test results.
14. List known limitations and unfinished work.

Do not claim a test passed unless you actually ran it.

**Work incrementally, inspect before modifying, preserve existing functionality, and stop after completing Phase 7.**