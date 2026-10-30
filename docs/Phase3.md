# FDR-Chain — Phase 3 Implementation
## Digital Bank Verification, Trust Tiers and Ed25519 Signatures

You are continuing the existing FDR-Chain project.

Your task is to implement Phase 3 only.

Do not recreate the project or replace the existing technology stack.

# 1. EXISTING PROJECT STACK

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
- Custom RBAC
- Row Level Security

Backend:
- Python FastAPI

Cryptography:
- Python Cryptography
- Ed25519
- SHA-256

# 2. PROJECT CONTEXT

FDR-Chain is a Government-style institutional Security Deposit / Fixed Deposit Receipt management portal.

Phase 1 implemented:
- Authentication
- User profiles
- Roles
- Institutions
- Regions
- Banks
- Bank branches

Phase 2 implemented:
- FDR registration
- FDR repository
- Document uploads
- Private Supabase Storage
- FDR activity history
- Maturity information

Inspect the existing implementation and preserve working functionality.

# 3. PHASE 3 OBJECTIVE

Implement three FDR trust tiers:

Tier 1:
Institution-declared FDR.

Tier 2:
FDR confirmed by a bank officer through a secure, single-use, expiring verification link.

Tier 3:
FDR verified through a valid Ed25519 digital signature using an authorized bank public key.

This phase must provide a working mock-bank demonstration.

Do not claim real bank integration.

# 4. DATABASE MIGRATION

Create these tables:

- bank_keys
- verification_requests
- bank_attestations

Reuse:
- fdrs
- fdr_events
- banks
- bank_branches
- institutions
- user_profiles
- user_roles

Implement the Phase 3 migration supplied in the project specification.

Add:
- Foreign keys
- Unique constraints
- Indexes
- RLS policies
- Safe database grants
- Server-only write access for sensitive attestation operations

Preserve historical attestations.

Do not allow frontend users to directly change trust_tier or verification_status.

Ensure the bank associated with an attestation is the same bank associated with the FDR.

# 5. TIER 2 VERIFICATION

Implement the complete Tier 2 workflow.

Institution user:
1. Opens an FDR.
2. Requests bank verification.
3. Receives a verification request reference.
4. Shares the generated link with the bank officer.

Backend:
1. Generate a cryptographically random token with at least 256 bits of randomness.
2. Store only the SHA-256 token hash.
3. Set an expiry, defaulting to 48 hours.
4. Bind the request to the FDR, institution and bank.
5. Store an immutable snapshot of the relevant FDR fields.
6. Allow only one pending request per FDR.
7. Do not log or expose raw tokens except when returning the initial link to the authorized requesting user.

Bank portal:
1. Open the verification link.
2. Validate the token through the backend.
3. Display the FDR details.
4. Allow explicit confirmation or rejection.
5. Require a final confirmation action.

Security:
- Consume the token atomically.
- Prevent replay.
- Reject expired tokens.
- Reject already-used tokens.
- Prevent simultaneous double confirmation.
- Reject requests where the FDR no longer matches its saved snapshot.
- Revoke an outstanding request before allowing edits to the fields covered by that request.
- Never upgrade trust tier based on link access alone.

On valid bank confirmation:
- Create a Tier 2 bank attestation.
- Set trust_tier to 2.
- Set verification_status to bank_confirmed.
- Preserve the previous FDR events.
- Create a new activity event.

On rejection:
- Consume the token.
- Save the rejection evidence.
- Set the verification status to rejected.
- Do not increase trust tier.

# 6. TIER 3 DIGITAL SIGNATURE VERIFICATION

Use Ed25519.

Create a mock bank environment with:
- Separate private key.
- Public key.
- Key ID.
- Bank identifier.
- Signed payload generation.

Generate the keypair using Python Cryptography.

Keep the private key in the mock-bank environment only.

Never place it in:
- React frontend
- Supabase
- Browser storage
- Git repository
- Public API responses

Store the public key in bank_keys.

Implement a signature service that:

1. Loads the registered public key.
2. Checks the bank association.
3. Checks key ID.
4. Checks algorithm.
5. Checks key validity.
6. Checks revocation status.
7. Checks signing timestamp.
8. Checks payload issuer.
9. Checks audience.
10. Checks schema version.
11. Checks nonce uniqueness.
12. Checks signature validity.
13. Checks FDR data against the actual database record.
14. Saves the attestation.
15. Updates the FDR to Tier 3 only after all checks succeed.

Use deterministic canonical payload serialization.

For the prototype:
- Sort JSON keys.
- Use UTF-8.
- Remove insignificant whitespace.
- Disallow NaN and Infinity.
- Represent monetary amounts as decimal strings.
- Normalize timestamps to UTC.

Document that this serialization is a prototype convention. Provide a documented migration path to RFC 8785 or an agreed bank canonicalization standard.

The signed payload must include:
- schema_version
- issuer
- audience
- key_id
- nonce
- issued_at
- institution_code
- bank_code
- branch_ifsc
- fdr_number
- amount
- currency
- issue_date
- maturity_date
- lien_in_favour

A valid signature over mismatched FDR data must be rejected.

Never update the trust tier merely because the cryptographic signature is valid. All business-data comparisons must also succeed.

# 7. KEY MANAGEMENT

Implement:
- Public-key registration
- Key listing
- Key activation
- Key expiry
- Key revocation
- Key rotation

Only authorized administrators can manage keys in this prototype.

Never expose private signing keys through key-management screens.

Retain historical public keys and verification records.

New signatures must use keys valid under the configured key lifecycle policy.

Provide a clear process for reviewing attestations if a key is later identified as compromised.

# 8. MOCK BANK PORTAL

Build a separate bank portal section.

Pages:
- Bank dashboard
- Pending verification requests
- FDR review page
- Confirmation page
- Signature submission page
- Key information page

Use a simulated bank dataset.

Display:
- Institution
- FDR number
- Bank
- Branch
- Amount
- Issue date
- Maturity date
- Lien beneficiary
- Request expiry

Provide:
- Confirm FDR
- Reject FDR
- Submit digitally signed payload

Use a secure token workflow for Tier 2.

For Tier 3, authenticate the mock-bank integration independently from normal user authentication.

Do not expose any mock-bank private key to React.

Clearly label the portal as a simulated integration.

# 9. API ENDPOINTS

Implement:

POST /api/v1/fdrs/{fdr_id}/verification-requests

GET /api/v1/bank/verification/{request_id}

POST /api/v1/bank/verification/confirm

POST /api/v1/bank/attestations

GET /api/v1/fdrs/{fdr_id}/attestations

GET /api/v1/admin/bank-keys

POST /api/v1/admin/bank-keys

PATCH /api/v1/admin/bank-keys/{key_id}/revoke

Use:
- Pydantic schemas
- Strict request validation
- Access-token validation
- Backend RBAC
- Bank-scoped authorization
- Structured errors
- Safe logging

The verification token must be submitted in a POST body, not exposed in application logs or analytics.

Use transactional database operations for token consumption, attestation creation and trust-tier changes.

# 10. TRUST TIER DISPLAY

Implement a reusable TrustTierBadge component.

Tier 1:
Institution declared.

Tier 2:
Bank confirmed.

Tier 3:
Signature verified.

Display:
- Verification method
- Verified bank
- Verification date
- Attestation reference
- Signature verification result where applicable

Clearly distinguish verification tier from lifecycle status and heartbeat status.

# 11. SECURITY REQUIREMENTS

Test:
- Token reuse.
- Token expiry.
- Invalid token.
- Token tampering.
- Simultaneous token consumption.
- FDR snapshot mismatch.
- Wrong bank.
- Wrong branch.
- Invalid signature.
- Modified payload.
- Unknown key ID.
- Expired key.
- Revoked key.
- Replayed nonce.
- Wrong audience.
- Wrong issuer.
- Incorrect timestamp.
- Valid signature with mismatched FDR data.
- Unauthorized key registration.
- Unauthorized trust-tier update.
- Unauthorized attestation creation.

Never log:
- Raw verification tokens.
- Private keys.
- Sensitive authentication credentials.

# 12. USER INTERFACE

Maintain the existing Government Enterprise theme:

Primary navy: #12345A
Secondary blue: #1D5F91
Background: #F4F6F9
Success: #16804A
Warning: #C58A12
Danger: #B42318

Create:
- Verification overview
- Verification timeline
- Trust-tier indicators
- Bank confirmation workflow
- Bank portal
- Key management
- Attestation history

Use accessible labels and confirmation dialogs.

# 13. TESTING

Use automated tests.

Test all three trust tiers.

Test positive and negative cryptographic cases.

Test RLS and backend authorization using separate institution, bank, bureau and administrator accounts.

Verify that an institution cannot promote its own FDR to Tier 2 or Tier 3.

Verify that the frontend cannot alter trusted verification fields.

Verify that a failed verification leaves the existing trust tier unchanged.

Verify that the database preserves previous attestations.

Run:
- Backend tests
- Frontend tests
- TypeScript checks
- Production build
- Database migration checks
- Mock-bank end-to-end workflow

# 14. STRICT PHASE BOUNDARY

Implement Phase 3 only.

Do not implement:
- Periodic heartbeat scheduling
- Maturity alert automation
- Renewal matching
- Parent-child FDR lineage
- Release/refund workflows
- Legacy migration
- OCR-based verification

Prepare extension points for Phase 4.

# 15. FINAL DELIVERABLES

Provide:
1. Phase 3 SQL migration.
2. Public-key registry.
3. Mock-bank key generation utility.
4. Mock-bank signing utility.
5. Tier 2 token service.
6. Tier 2 bank confirmation workflow.
7. Tier 3 signature verification service.
8. FastAPI endpoints.
9. React verification pages.
10. Mock bank portal.
11. Trust-tier indicators.
12. Attestation history.
13. Security tests.
14. Updated README.
15. Environment setup instructions.
16. Screenshots of completed functionality.
17. Final test report.

Do not mark a feature complete until it has been tested.

Stop after Phase 3 and wait for approval before starting Phase 4.