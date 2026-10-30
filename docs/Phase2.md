# FDR-Chain — Phase 2: FDR Repository and Document Management

## 1. Project Context

Continue the existing FDR-Chain project.

FDR-Chain is a Government-style Security Deposit / Fixed Deposit Receipt (FDR) Management Portal for managing institutional FDR records.

Phase 1 has established:
- React + Vite + TypeScript frontend
- Supabase PostgreSQL
- Supabase Auth
- User profiles
- Six system roles
- Institution management
- Region management
- Bank management
- Bank branch management
- Initial RLS policies
- FastAPI foundation

Do not recreate Phase 1.

Inspect the existing repository, database and implemented functionality before making changes.

## 2. Final Technology Stack

Frontend:
- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- React Router DOM
- TanStack Query
- React Hook Form
- Zod

Database:
- Supabase PostgreSQL

Authentication:
- Supabase Auth

File storage:
- Supabase Storage

Backend:
- Python FastAPI

## 3. Phase 2 Objective

Implement a complete FDR repository and secure document management system.

Users must be able to register FDR records, upload documents, search and filter FDRs, inspect details and track maturity dates.

Every institution-submitted FDR must begin at Trust Tier 1.

Do not claim that uploaded documents have been verified by a bank.

## 4. Database Implementation

Extend the existing Phase 1 database.

Create:
- fdrs
- documents
- fdr_events

Use the supplied Phase 2 SQL migration as the starting point.

Important FDR fields:
- id
- institution_id
- bank_id
- branch_id
- fdr_number
- amount
- currency
- issue_date
- maturity_date
- interest_rate
- lien_in_favour
- lifecycle_status
- trust_tier
- verification_status
- heartbeat_status
- remarks
- created_by
- created_at
- updated_at

Important database requirements:

1. Use UUID primary keys.
2. Use numeric(18,2) for monetary amounts.
3. Use foreign keys.
4. Add appropriate indexes.
5. Prevent duplicate FDR numbers for the same bank.
6. Validate issue date and maturity date.
7. Validate positive financial amounts.
8. Enforce document ownership.
9. Preserve FDR history.
10. Do not allow institution users to modify trust or verification status.
11. Do not allow institution users to delete FDR records.
12. Use migrations rather than destructive schema changes.
13. Ensure document institution IDs match their associated FDR.
14. Review grants and RLS policies together.

## 5. FDR Registration

Create a multi-section registration form.

Section A: Institution information
- Institution
- Institution code
- Region
- Contact person

Automatically derive the institution association from the authenticated user profile. Never trust an institution ID supplied by the browser without checking authorization.

Section B: Bank information
- Bank dropdown
- Branch dropdown
- IFSC display
- FDR number
- Lien beneficiary

Load bank branches dynamically when the selected bank changes.

Section C: Financial information
- Principal amount
- Currency (INR)
- Issue date
- Maturity date
- Interest rate (optional)
- Remarks

Validate all fields.

Section D: Documents
- Original FDR PDF or image
- Supporting documents
- Document description

The original FDR document is required for submission.

## 6. Initial FDR Status

Every new FDR must start with:

lifecycle_status = pending
trust_tier = 1
verification_status = institution_declared
heartbeat_status = not_started

Do not expose these values as editable form controls.

Do not provide a frontend action that changes the trust tier.

Do not mark an institution-submitted FDR as bank verified.

## 7. FDR Repository

Build a professional data table with:

- FDR number
- Institution
- Bank
- Branch
- Amount
- Issue date
- Maturity date
- Lifecycle status
- Trust tier
- Verification status
- Actions

Features:
- Search
- Sorting
- Pagination
- Bank filter
- Institution filter
- Region filter
- Maturity date filter
- Lifecycle filter
- Trust tier filter
- Verification filter
- Responsive table
- Loading state
- Empty state
- Error state

Ensure all queries are scoped by Supabase RLS.

Use server-side pagination for large datasets.

## 8. FDR Details Page

Display:

- FDR number
- Institution information
- Bank and branch
- Financial details
- Issue and maturity dates
- Lien beneficiary
- Lifecycle status
- Trust tier
- Verification status
- Heartbeat status
- Uploaded documents
- Registration information
- Activity history

Use clear status labels and distinguish institution declarations from bank confirmations.

## 9. FDR Editing

Allow authorized institution users to edit permitted fields while the FDR is pending.

Do not allow users to change:

- institution_id
- created_by
- trust_tier
- verification_status
- heartbeat_status
- lifecycle_status

Use column-level privileges and RLS or a trusted backend service to enforce this.

Record each modification in fdr_events.

Do not silently overwrite or delete uploaded original documents.

## 10. Supabase Storage

Create a private bucket:

fdr-documents

Suggested path:

institution-id/fdr-id/document-id/filename

Implement:

- Authenticated uploads
- Authorized downloads
- Private bucket policies
- File size limits
- MIME type validation
- Unique server-generated paths
- Short-lived signed URLs
- Secure deletion handling

Allowed document formats:
- PDF
- JPEG
- PNG

Configure a reasonable maximum file size, such as 10 MB per document, and make it configurable.

Validate both file extension and actual content where possible.

Never create a public document bucket.

Do not trust a client-provided storage path.

## 11. Document Metadata

For every uploaded document, store:

- fdr_id
- institution_id
- document_type
- original_filename
- storage_path
- mime_type
- file_size_bytes
- sha256_checksum
- uploaded_by
- uploaded_at

The checksum is for file integrity checking, not proof of bank authenticity.

If database metadata creation fails after an upload, clean up the orphaned storage object.

Prevent unauthorized access through both Storage RLS and application authorization checks.

## 12. FDR Activity History

Create activity events for:

- FDR registration
- FDR edits
- Document uploads
- Document deactivation
- Other authorized administrative changes

Store:
- fdr_id
- institution_id
- actor_id
- event_type
- description
- metadata
- created_at

Do not allow normal users to edit or delete existing events.

Use trusted backend services for privileged system-generated events.

## 13. Dashboard

Create a Phase 2 FDR dashboard displaying real database information.

Metrics:
- Total registered FDRs
- Pending records
- Active records
- Tier 1 records
- Upcoming maturity dates

Add a maturity overview and recent activity section.

Do not fabricate statistics or use hardcoded counts.

Clearly label data that has not been bank verified.

## 14. FastAPI Integration

Implement or extend:

GET /api/v1/health

GET /api/v1/fdrs

GET /api/v1/fdrs/{fdr_id}

POST /api/v1/fdrs

PATCH /api/v1/fdrs/{fdr_id}

GET /api/v1/fdrs/{fdr_id}/documents

POST /api/v1/fdrs/{fdr_id}/documents

GET /api/v1/documents/{document_id}/download

GET /api/v1/fdrs/{fdr_id}/events

Use proper Pydantic request and response schemas.

Validate Supabase access tokens.

Check user permissions on the backend.

Use safe parameterized database operations.

Do not expose Supabase service-role credentials to React.

Choose one consistent implementation approach for each operation. Do not duplicate frontend and backend write paths in a way that bypasses security rules.

## 15. Government UI

Maintain the existing FDR-Chain visual identity:

Primary navy: #12345A
Secondary blue: #1D5F91
Background: #F4F6F9
Card background: #FFFFFF
Text: #1B2733
Secondary text: #64748B
Success: #16804A
Warning: #C58A12
Danger: #B42318
Border: #D9E0E8

Use:
- Professional government dashboard layout
- Sidebar navigation
- Responsive forms
- Clear labels
- Accessible status badges
- Consistent tables
- Confirmation dialogs
- Useful empty states
- Loading skeletons
- Toast notifications

Avoid excessive gradients and animations.

## 16. Security and Testing

Test:

- Institution A cannot read Institution B's FDRs.
- Institution A cannot upload documents to Institution B's FDRs.
- Institution A cannot edit Institution B's FDRs.
- Users cannot assign themselves another institution.
- Users cannot set trust_tier to 2 or 3.
- Users cannot modify verification_status.
- Users cannot modify lifecycle_status directly.
- Users cannot delete FDR records.
- Unauthorized users cannot download documents.
- Private storage files are not accessible through public URLs.
- Invalid file types are rejected.
- Oversized files are rejected.
- Duplicate FDR numbers are handled correctly.
- Invalid dates are rejected.
- Failed uploads do not leave orphaned records.
- Database failures are handled properly.
- Activity events are generated correctly.

Use separate accounts to test all relevant roles.

## 17. Strict Phase Boundary

Implement Phase 2 only.

Do not implement:
- Digital bank signature verification
- Tier 2 or Tier 3 verification workflows
- Heartbeat processing
- Renewal matching
- Parent-child FDR lineage
- Release/refund workflows
- AI or OCR verification
- Automated bank integrations

Prepare extension points for future modules.

## 18. Final Deliverables

Provide:
1. Phase 2 SQL migration.
2. FDR repository frontend.
3. FDR registration form.
4. FDR detail and edit pages.
5. Secure document upload.
6. Private Supabase Storage configuration.
7. Activity history.
8. FastAPI endpoints.
9. Validation and error handling.
10. RLS and Storage policies.
11. Automated tests.
12. Updated README.
13. Setup and migration instructions.
14. Completion report.

Run the frontend build and all tests.

Fix critical issues before completion.

Stop after Phase 2. Wait for approval before implementing Phase 3.