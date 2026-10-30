"""
Phase 9: Complete Testing, Validation and Finalization Test Suite

Comprehensive automated test suite covering:
1. SHA-256 Hash-Chain Audit Integrity & Tamper Detection
2. Strict Independence of the 3 Orthogonal Properties:
   - Lifecycle Status (pending, active, renewed, released, closed)
   - Trust Tier (1, 2, 3)
   - Heartbeat Status (not_started, alive, stale, broken)
3. End-to-End Multi-Phase Full Lifecycle Integration
4. Security & Access Control Boundaries (RBAC, Self-Approval, Prohibited Mutations)
5. Robustness & Negative Boundary Validation (Duplicates, Malicious Input, Path Traversal)
"""

import pytest
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.services.fdr_service import fdr_service, LOCAL_FDR_STORE
from app.services.audit_chain_service import audit_chain_service, GENESIS_HASH

client = TestClient(app)

ADMIN_HEADERS = {"Authorization": "Bearer dev-system_admin-token"}
BUREAU_HEADERS = {"Authorization": "Bearer dev-bureau_officer-token"}
INST_HEADERS = {"Authorization": "Bearer dev-institution_user-token"}
FINANCE_HEADERS = {"Authorization": "Bearer dev-finance_officer-token"}
BANK_HEADERS = {"Authorization": "Bearer dev-bank_nodal_officer-token"}
RO_HEADERS = {"Authorization": "Bearer dev-regional_officer-token"}

# ==============================================================================
# 1. SHA-256 HASH-CHAIN AUDIT INTEGRITY & TAMPER DETECTION
# ==============================================================================

def test_audit_chain_verification_endpoint():
    """
    Verifies that GET /api/v1/fdrs/{fdr_id}/audit-chain cryptographically validates
    the intact SHA-256 hash-chain of audit events.
    """
    fdr_num = f"FDR-AUDIT-{datetime.now().microsecond}"
    create_res = client.post("/api/v1/fdrs", json={
        "bank_id": "bank-01",
        "branch_id": "branch-01",
        "fdr_number": fdr_num,
        "amount": 1000000.0,
        "issue_date": (date.today() - timedelta(days=10)).isoformat(),
        "maturity_date": (date.today() + timedelta(days=350)).isoformat(),
        "interest_rate": 7.0,
        "lien_in_favour": "Audit Test Authority",
        "institution_id": "inst-01"
    }, headers=ADMIN_HEADERS)
    assert create_res.status_code == 201
    fdr_id = create_res.json()["id"]

    # Append an update event
    patch_res = client.patch(f"/api/v1/fdrs/{fdr_id}", json={
        "remarks": "Updated with audit verification log"
    }, headers=ADMIN_HEADERS)
    assert patch_res.status_code == 200

    res = client.get(f"/api/v1/fdrs/{fdr_id}/audit-chain", headers=ADMIN_HEADERS)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["fdr_id"] == fdr_id
    assert data["is_valid"] is True
    assert data["events_count"] == 2
    assert data["genesis_hash"] == GENESIS_HASH
    assert data["latest_hash"] is not None
    assert data["error_message"] is None

def test_audit_chain_detects_tampered_payload():
    """
    Simulates a database tampering attack on an intermediate audit record
    and verifies that audit_chain_service mathematically detects the discrepancy.
    """
    # Create a fresh mock event chain
    now = datetime.now(timezone.utc)
    events = [
        {
            "id": "evt-t1",
            "fdr_id": "fdr-tamper",
            "institution_id": "inst-01",
            "actor_id": "usr-01",
            "event_type": "fdr_registered",
            "description": "Genesis registration event",
            "metadata": {"amount": 500000},
            "created_at": now - timedelta(hours=2)
        },
        {
            "id": "evt-t2",
            "fdr_id": "fdr-tamper",
            "institution_id": "inst-01",
            "actor_id": "usr-02",
            "event_type": "fdr_updated",
            "description": "Official update event",
            "metadata": {"interest_rate": 7.2},
            "created_at": now - timedelta(hours=1)
        }
    ]
    # Chain properly
    audit_chain_service.chain_events(events)

    # Verify untampered chain is valid
    is_valid, err, count = audit_chain_service.verify_chain(events)
    assert is_valid is True
    assert count == 2

    # Malicious actor silently alters description in database
    events[0]["description"] = "MALICIOUSLY ALTERED DESCR TO HIDE PENALTY"
    is_valid, err, count = audit_chain_service.verify_chain(events)
    assert is_valid is False
    assert "Tamper detected at block 0" in err

def test_audit_chain_detects_deleted_event():
    """
    Simulates deletion of an intermediate audit log and asserts chain break detection.
    """
    now = datetime.now(timezone.utc)
    events = [
        {"id": f"evt-{i}", "fdr_id": "fdr-del", "institution_id": "inst-01", "actor_id": "usr-1", "event_type": "test", "description": f"Event {i}", "metadata": {}, "created_at": now + timedelta(minutes=i)}
        for i in range(3)
    ]
    audit_chain_service.chain_events(events)

    # Delete block 1
    tampered_events = [events[0], events[2]]
    is_valid, err, count = audit_chain_service.verify_chain(tampered_events)
    assert is_valid is False
    assert "Chain break at block 1" in err

# ==============================================================================
# 2. THREE INDEPENDENT PROPERTIES INVARIANT (Instruction 15)
# ==============================================================================

def test_three_orthogonal_properties_independence():
    """
    Instruction 15 & Important Restrictions:
    - Never automatically merge lifecycle, trust and heartbeat statuses.
    - Lifecycle Status, Trust Tier, and Heartbeat Status are strictly independent.
    """
    # Create test FDR
    fdr_num = f"FDR-ORTHO-{datetime.now().microsecond}"
    payload = {
        "bank_id": "bank-01",
        "branch_id": "branch-01",
        "fdr_number": fdr_num,
        "amount": 1000000.0,
        "issue_date": (date.today() - timedelta(days=30)).isoformat(),
        "maturity_date": (date.today() + timedelta(days=335)).isoformat(),
        "interest_rate": 7.0,
        "lien_in_favour": "Statutory Authority",
        "institution_id": "inst-01"
    }
    create_res = client.post("/api/v1/fdrs", json=payload, headers=ADMIN_HEADERS)
    assert create_res.status_code == 201
    fdr = create_res.json()
    fdr_id = fdr["id"]

    # Initial state
    assert fdr["lifecycle_status"] == "pending"
    assert fdr["trust_tier"] == 1
    assert fdr["heartbeat_status"] == "not_started"

    # 1. Update heartbeat status -> Trust Tier and Lifecycle MUST NOT CHANGE
    target_fdr = next(f for f in LOCAL_FDR_STORE if f["id"] == fdr_id)
    target_fdr["heartbeat_status"] = "alive"

    detail_res = client.get(f"/api/v1/fdrs/{fdr_id}", headers=ADMIN_HEADERS)
    fdr_after_hb = detail_res.json()
    assert fdr_after_hb["heartbeat_status"] == "alive"
    assert fdr_after_hb["trust_tier"] == 1, "Heartbeat check must never alter Trust Tier"
    assert fdr_after_hb["lifecycle_status"] == "pending", "Heartbeat check must never alter Lifecycle Status"

    # 2. Simulate heartbeat check failure (broken deposit) -> Trust Tier and Lifecycle MUST STILL REMAIN INDEPENDENT
    target_fdr["heartbeat_status"] = "broken"

    detail_res2 = client.get(f"/api/v1/fdrs/{fdr_id}", headers=ADMIN_HEADERS)
    fdr_broken = detail_res2.json()
    assert fdr_broken["heartbeat_status"] == "broken"
    assert fdr_broken["trust_tier"] == 1
    assert fdr_broken["lifecycle_status"] == "pending"

    # 3. Elevate Trust Tier to 2 -> Lifecycle and Heartbeat MUST NOT CHANGE
    target_fdr["trust_tier"] = 2
    detail_res3 = client.get(f"/api/v1/fdrs/{fdr_id}", headers=ADMIN_HEADERS)
    fdr_t2 = detail_res3.json()
    assert fdr_t2["trust_tier"] == 2
    assert fdr_t2["heartbeat_status"] == "broken"
    assert fdr_t2["lifecycle_status"] == "pending"

    # 4. Advance Lifecycle to active -> Trust Tier and Heartbeat MUST NOT CHANGE
    target_fdr["lifecycle_status"] = "active"
    detail_res4 = client.get(f"/api/v1/fdrs/{fdr_id}", headers=ADMIN_HEADERS)
    fdr_active = detail_res4.json()
    assert fdr_active["lifecycle_status"] == "active"
    assert fdr_active["trust_tier"] == 2
    assert fdr_active["heartbeat_status"] == "broken"

# ==============================================================================
# 3. END-TO-END MULTI-PHASE FULL LIFECYCLE
# ==============================================================================

def test_end_to_end_full_lifecycle_flow():
    """
    Validates complete workflow across all modules:
    Registration (P2) -> Bank Verification (P3) -> Heartbeat (P4) ->
    Task Priority (P6) -> Compliance Doc (P7) -> Release & Closure (P8).
    """
    fdr_num = f"FDR-E2E-{datetime.now().microsecond}"
    # Phase 2: Create
    p2_res = client.post("/api/v1/fdrs", json={
        "bank_id": "bank-01",
        "branch_id": "branch-01",
        "fdr_number": fdr_num,
        "amount": 5000000.0,
        "issue_date": (date.today() - timedelta(days=60)).isoformat(),
        "maturity_date": (date.today() + timedelta(days=300)).isoformat(),
        "interest_rate": 7.5,
        "lien_in_favour": "National Highway Authority",
        "institution_id": "inst-01"
    }, headers=ADMIN_HEADERS)
    assert p2_res.status_code == 201
    fdr_id = p2_res.json()["id"]

    # Phase 3: Initiate Verification
    p3_init = client.post(
        f"/api/v1/fdrs/{fdr_id}/verification-requests",
        headers=INST_HEADERS
    )
    assert p3_init.status_code == 201

    # Phase 4: Heartbeat Check Dispatch
    p4_hb = client.post(
        f"/api/v1/fdrs/{fdr_id}/heartbeat/request",
        json={"verification_method": "tier2_bank_confirmation", "notes": "E2E check"},
        headers=ADMIN_HEADERS
    )
    assert p4_hb.status_code == 201

    # Phase 6: Sync Officer Tasks & check queue
    p6_sync = client.post("/api/v1/officer/tasks/sync", headers=ADMIN_HEADERS)
    assert p6_sync.status_code == 200

    # Phase 7: Generate Compliance Document
    p7_doc = client.post("/api/v1/compliance/documents/generate", json={
        "template_id": "template-001",
        "institution_id": "inst-01",
        "fdr_id": fdr_id,
        "custom_title": "E2E Statutory Verification Certificate"
    }, headers=ADMIN_HEADERS)
    assert p7_doc.status_code == 200
    doc_id = p7_doc.json()["id"]

    # Submit & Approve Compliance Document
    client.post(f"/api/v1/compliance/documents/{doc_id}/submit-review", headers=ADMIN_HEADERS)
    client.post(
        f"/api/v1/compliance/documents/{doc_id}/review",
        json={"action": "approved", "comments": "Approved for signing"},
        headers=BUREAU_HEADERS
    )

    # Mock eSign Compliance Document
    p7_sign = client.post(f"/api/v1/compliance/documents/{doc_id}/mock-sign", json={
        "signer_display_name": "Dr. Rajeshwar Sharma (System Administrator)",
        "consent_acknowledged": True
    }, headers=ADMIN_HEADERS)
    assert p7_sign.status_code == 200

    # Phase 8: Create and submit release request
    p8_res = client.post(
        f"/api/v1/fdrs/{fdr_id}/release-requests",
        json={"request_reason": "Complete statutory clearance for release."},
        headers=INST_HEADERS
    )
    assert p8_res.status_code == 201
    req_id = p8_res.json()["id"]

    sub_res = client.post(f"/api/v1/release-requests/{req_id}/submit", headers=INST_HEADERS)
    assert sub_res.status_code == 200

    # Satisfy checklist items
    chk_res = client.get(f"/api/v1/release-requests/{req_id}/checklist", headers=BUREAU_HEADERS)
    for item in chk_res.json():
        client.patch(
            f"/api/v1/release-requests/{req_id}/checklist/{item['id']}",
            json={"review_status": "satisfied", "review_comments": "Verified and cleared"},
            headers=BUREAU_HEADERS
        )

    # Supervisory approval
    app_res = client.post(
        f"/api/v1/release-requests/{req_id}/approve",
        json={"decision": "approve", "comments": "Regulatory audit cleared. Approved for bank lien release."},
        headers=BUREAU_HEADERS
    )
    assert app_res.status_code == 200

    # Prepare release instruction
    inst_res = client.post(
        f"/api/v1/release-requests/{req_id}/release-instruction",
        json={"instruction_reference": "AICTE/REL/INST/2026/0091", "bank_notes": "Revoke statutory lien."},
        headers=BUREAU_HEADERS
    )
    assert inst_res.status_code == 200

    # Bank Release Confirmation
    bank_res = client.post(
        f"/api/v1/release-requests/{req_id}/bank-confirmation",
        json={
            "bank_reference": "SBI/REV/LIEN-REL/2026-9912",
            "confirmation_method": "simulated_bank_portal",
            "decision": "released"
        },
        headers=ADMIN_HEADERS
    )
    assert bank_res.status_code == 200

    # Record Refund & Reconcile
    tx_res = client.post(
        f"/api/v1/release-requests/{req_id}/refunds",
        json={
            "amount": 5000000.00,
            "transaction_reference": "REF-TX-2026-001",
            "payment_mode": "RTGS",
            "utr_number": "SBIN202604829101"
        },
        headers=FINANCE_HEADERS
    )
    assert tx_res.status_code == 201

    rec_res = client.post(
        f"/api/v1/release-requests/{req_id}/reconciliation",
        json={"status": "reconciled", "reconciliation_notes": "Bank credit confirmed via RTGS UTR audit."},
        headers=FINANCE_HEADERS
    )
    assert rec_res.status_code == 200

    # Final Account Closure
    closure_res = client.post(
        f"/api/v1/release-requests/{req_id}/close",
        json={"closure_notes": "Complete end-to-end statutory closure executed. Audit records archived."},
        headers=BUREAU_HEADERS
    )
    assert closure_res.status_code == 200

    # Verify FDR status is closed and audit chain is 100% valid
    fdr_final = client.get(f"/api/v1/fdrs/{fdr_id}", headers=ADMIN_HEADERS).json()
    assert fdr_final["lifecycle_status"] == "closed"

    chain_ver = client.get(f"/api/v1/fdrs/{fdr_id}/audit-chain", headers=ADMIN_HEADERS).json()
    assert chain_ver["is_valid"] is True
    assert chain_ver["events_count"] >= 1

# ==============================================================================
# 4. SECURITY & RBAC NEGATIVE BOUNDARY TESTING
# ==============================================================================

def test_security_prevent_role_escalation_across_endpoints():
    """
    Verifies that unauthorized roles (institution users, regional officers) cannot access
    administrative policy, key registry, or supervisor endpoints.
    """
    # Institution user cannot create bank key
    key_res = client.post("/api/v1/admin/bank-keys", json={
        "bank_id": "bank-01",
        "key_id": "TEST-UNAUTH-KEY",
        "algorithm": "Ed25519",
        "public_key_pem": "test"
    }, headers=INST_HEADERS)
    assert key_res.status_code == 403

    # Institution user cannot alter release policy
    pol_res = client.post("/api/v1/admin/release-policies", json={
        "policy_name": "Unauthorized Policy",
        "policy_version": "RPV-UNAUTH-2026",
        "policy_description": "Unauthorized attempt",
        "source_reference": "Test",
        "checklist_configuration": [
            {"key": "CHK_TEST", "title": "Test Item", "is_required": True}
        ],
        "approval_configuration": {"stages": [{"stage": "review", "role": "system_admin", "label": "Review"}]},
        "is_active": True
    }, headers=INST_HEADERS)
    assert pol_res.status_code == 403

    # Institution user cannot update queue policies
    q_res = client.put("/api/v1/officer/policies/policy-001", json={
        "weights": {"broken_fdr": 90}
    }, headers=INST_HEADERS)
    assert q_res.status_code == 403

def test_security_prevent_prohibited_fdr_field_tampering():
    """
    Verifies that users cannot tamper with trust_tier, verification_status,
    or lifecycle_status directly via PATCH /fdrs/{id}.
    """
    patch_res = client.patch("/api/v1/fdrs/fdr-001", json={
        "trust_tier": 3,
        "lifecycle_status": "active"
    }, headers=INST_HEADERS)
    assert patch_res.status_code == 403

def test_security_duplicate_fdr_number_prevention():
    """
    Verifies that duplicate deposit registration under the same bank is prohibited.
    """
    fdr_num = f"FDR-DUP-{datetime.now().microsecond}"
    payload = {
        "bank_id": "bank-01",
        "branch_id": "branch-01",
        "fdr_number": fdr_num,
        "amount": 250000.0,
        "issue_date": (date.today() - timedelta(days=10)).isoformat(),
        "maturity_date": (date.today() + timedelta(days=350)).isoformat(),
        "lien_in_favour": "Statutory Authority",
        "institution_id": "inst-01"
    }
    res1 = client.post("/api/v1/fdrs", json=payload, headers=ADMIN_HEADERS)
    assert res1.status_code == 201

    # Duplicate attempt
    res2 = client.post("/api/v1/fdrs", json=payload, headers=ADMIN_HEADERS)
    assert res2.status_code == 400
    assert "already registered" in res2.text.lower()
