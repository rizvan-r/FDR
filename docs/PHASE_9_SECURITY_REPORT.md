# Phase 9: Security Architecture & Vulnerability Audit Report

## 1. Security Overview & Scope

This report documents the security posture, cryptographic controls, authorization boundaries, and defense-in-depth mechanisms implemented in **FDR-Chain**. The audit covers both backend services (FastAPI) and frontend client code (React/TypeScript), verifying compliance with the strict security directives outlined in Phase 9.

| Security Pillar | Verification Status | Implementation Mechanism |
|---|---|---|
| **Authentication** | Verified | Supabase Auth JWTs with HS256/RS256 validation |
| **Authorization (RBAC)** | Verified | Server-side role inspection; zero trust in frontend state |
| **Tenant Isolation** | Verified | Multi-tenant RLS policies + FastAPI institution claim checks |
| **Field Immutability** | Verified | Direct tampering blocked on critical financial and status fields |
| **Cryptographic Signatures** | Verified | Ed25519 digital signatures with replay prevention |
| **Audit Log Integrity** | Verified | RFC 8785 Canonical JSON with SHA-256 hash chaining |
| **Secret Management** | Verified | Zero service-role keys exposed in frontend bundles |

---

## 2. Authentication & JWT Validation

All protected API endpoints require an `Authorization: Bearer <token>` header. Authentication token validation occurs within [`backend/app/core/auth.py`](file:///i:/Richu/Projects/SIH/FDR/backend/app/core/auth.py):

1. **Token Signature Verification**: Validated using Supabase JWT secret or public keys.
2. **Actor Profile Resolution**: The sub-claim (`sub`) maps directly to `profiles.id` in PostgreSQL.
3. **Role & Tenant Claims**: The user's role (`institution_officer`, `institution_admin`, `bank_representative`, `system_admin`, `auditor`) and tenant linkage (`institution_id`, `bank_id`) are extracted from server-side database records, never from unverified request headers.
4. **Token Expiry**: Expired tokens are rejected immediately with HTTP 401 Unauthorized.

---

## 3. Role-Based Access Control (RBAC) & Boundary Tests

Strict boundary validation prevents privilege escalation across user personas. Automated tests in `test_phase9_comprehensive.py::test_security_prevent_role_escalation_across_endpoints` verify:

```
[Request] ---> [FastAPI Route Guard] ---> [Role Allowed?]
                       |                         |
                      No                        Yes
                       v                         v
               HTTP 403 Forbidden        [Service Business Logic]
```

### RBAC Matrix Summary

| Role | Permitted Actions | Strictly Prohibited Actions (HTTP 403) |
|---|---|---|
| **Institution Officer** | Create FDR drafts, upload documents, initiate verification, create release requests | Register bank keys, change institution policies, approve own release requests |
| **Institution Admin** | Configure officer policies, approve/reject release requests, manage users | Sign CBS bank attestations, alter bank public keys |
| **Bank Representative** | Review branch FDRs, dispatch CBS attestations, submit mock e-signatures | Create institutional FDRs, modify approval policies, view other banks' requests |
| **System Admin** | Register bank public keys, configure global heartbeat policies | Modify audit events, forge institutional financial balances |
| **Auditor** | Read-only inspection of FDRs, lineages, and audit chain verification | Any mutation (`POST`, `PUT`, `DELETE`) on any business object |

---

## 4. Protected Fields & Anti-Tampering Engine

FDRs hold government treasury assets. To prevent unauthorized state manipulation, updating an FDR via `PUT /api/v1/fdrs/{fdr_id}` strictly prohibits client modification of the following parameters:

```python
PROHIBITED_FIELDS = {
    "id",
    "institution_id",
    "trust_tier",
    "lifecycle_status",
    "heartbeat_status",
    "verification_status",
}
```

- If an incoming payload contains any of these fields with values that attempt to mutate the record, the API raises an explicit `HTTP 403 Forbidden: Modifying prohibited field '<field>' is strictly forbidden`.
- State transitions can **only** occur through dedicated transactional endpoints (e.g. `/verification-requests/{id}/confirm`, `/heartbeat/request`, `/release-requests/{id}/approve`).

---

## 5. Cryptographic Attestation & Ed25519 Signatures (Tier 3)

The application implements asymmetric cryptography to verify bank authenticity:

1. **Algorithm**: Ed25519 (Edwards-curve Digital Signature Algorithm), providing 128-bit security level.
2. **Canonical Payload Formulation**:
   ```json
   {
     "amount": 10000000.0,
     "bank_code": "SBIN",
     "branch_ifsc": "SBIN0000691",
     "fdr_number": "FDR-2026-9901",
     "issue_date": "2026-01-01",
     "lien_in_favour": "Chairman, NHAI",
     "maturity_date": "2027-01-01",
     "nonce": "a7c8e4...uuid4"
   }
   ```
3. **Replay Defense**: Every attestation request contains a cryptographically random, single-use `nonce`. Nonces are checked against `fdr_attestations` and invalidated after use. Replayed nonces trigger HTTP 400 rejection.
4. **Tamper Detection**: Altering any byte in the canonical payload (e.g., changing ₹10,00,000 to ₹10,00,001) causes signature verification to fail immediately.

---

## 6. Immutable SHA-256 Hash-Chain Audit Trail

Every operational action on an FDR generates an append-only event in `fdr_events`.

### Hash-Chain Math
Each event computes:
$$\text{event\_hash} = \text{SHA-256}\Big(\text{prev\_event\_hash} \parallel \text{fdr\_id} \parallel \text{event\_type} \parallel \text{canonical\_json}(\text{metadata}) \parallel \text{created\_at}\Big)$$

- **RFC 8785 Canonical JSON**: Eliminates whitespace ambiguity and normalizes key ordering.
- **Continuous Validation**: `GET /api/v1/fdrs/{fdr_id}/audit-chain` verifies every link in sequence from the genesis block (`00000...0000`).
- **Tamper & Deletion Defense**: Verified by tests `test_audit_chain_detects_tampered_payload` and `test_audit_chain_detects_deleted_event`. Any alteration or removal breaks all subsequent links.

---

## 7. Frontend Secret Isolation Audit

A static audit was performed on the client bundle generated during `npm run build`:

```bash
# Grep for service role key or sensitive environment prefixes in dist/
grep -rn "service_role" frontend/dist/
```

- **Result**: **Zero hits**. The frontend only accesses public environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- The Supabase Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) resides exclusively in `backend/.env` on the protected server runtime.
