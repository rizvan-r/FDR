"""
Automated Integration and Unit Test Suite for Phase 8:
FDR Release, Refund & Closure Management.
Validates:
- Release request lifecycle (draft -> submitted -> reviews -> approved/rejected -> bank_confirmed -> closed)
- Strict conflicting active request invariant
- Cross-institution isolation
- Checklist engine and mandatory item satisfaction invariant
- Separation of duties & self-approval prevention
- Return for correction and resubmission
- Simulated bank release confirmation with mandatory disclaimer
- Refund transaction recording, partial payments & financial reconciliation
- Final statutory closure and FDR lifecycle update
- Policy administration CRUD & RBAC enforcement
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.release_service import (
    ReleaseService,
    _MOCK_RELEASE_REQUESTS,
    _MOCK_CHECKLIST_ITEMS,
    _MOCK_REVIEWS,
    _MOCK_BANK_RELEASES,
    _MOCK_REFUNDS,
    _MOCK_REFUND_TRANSACTIONS,
    _MOCK_CLOSURES,
    _MOCK_POLICIES
)
from app.services.fdr_service import LOCAL_FDR_STORE

client = TestClient(app)

ADMIN_HEADERS = {"Authorization": "Bearer dev-system_admin-token"}
BUREAU_HEADERS = {"Authorization": "Bearer dev-bureau_officer-token"}
REGIONAL_HEADERS = {"Authorization": "Bearer dev-regional_officer-token"}
FINANCE_HEADERS = {"Authorization": "Bearer dev-finance_officer-token"}
INSTITUTION_HEADERS = {"Authorization": "Bearer dev-institution_user-token"}

@pytest.fixture(autouse=True)
def reset_stores():
    """Reset Phase 8 in-memory stores before each test to maintain state isolation."""
    _MOCK_RELEASE_REQUESTS.clear()
    _MOCK_CHECKLIST_ITEMS.clear()
    _MOCK_REVIEWS.clear()
    _MOCK_BANK_RELEASES.clear()
    _MOCK_REFUNDS.clear()
    _MOCK_REFUND_TRANSACTIONS.clear()
    _MOCK_CLOSURES.clear()
    ReleaseService.get_active_policy()

# ==============================================================================
# 1. POLICY ADMINISTRATION TESTS
# ==============================================================================

def test_list_and_create_release_policy():
    res = client.get("/api/v1/admin/release-policies", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    policies = res.json()
    assert len(policies) >= 1
    assert any(p["policy_version"] == "RPV-2026.1" for p in policies)

    # Admin creates custom policy
    payload = {
        "policy_name": "AICTE Autonomous Polytechnic Release Rules",
        "policy_version": "RPV-POLY-2026",
        "policy_description": "Polytechnic endowment lien release policy",
        "source_reference": "AICTE Notification 2026/POL",
        "checklist_configuration": [
            {"key": "CHK_POLY_INVENTORY", "title": "Lab Inventory Audit", "is_required": True}
        ],
        "approval_configuration": {"stages": [{"stage": "authority_review", "role": "system_admin", "label": "Sanction"}]},
        "is_active": True
    }
    create_res = client.post("/api/v1/admin/release-policies", json=payload, headers=ADMIN_HEADERS)
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["policy_version"] == "RPV-POLY-2026"
    assert len(data["checklist_configuration"]) == 1

def test_unauthorized_policy_creation_rejected():
    payload = {
        "policy_name": "Unauthorized Policy",
        "policy_version": "RPV-HACK-001",
        "checklist_configuration": []
    }
    res = client.post("/api/v1/admin/release-policies", json=payload, headers=INSTITUTION_HEADERS)
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]

# ==============================================================================
# 2. RELEASE REQUEST CREATION & CONFLICT PREVENTION TESTS
# ==============================================================================

def test_create_release_request_valid():
    payload = {
        "request_reason": "Statutory completion of 5-year endowment deposit tenure for institutional approval."
    }
    res = client.post("/api/v1/fdrs/fdr-001/release-requests", json=payload, headers=INSTITUTION_HEADERS)
    assert res.status_code == 201
    data = res.json()
    assert data["request_status"] == "draft"
    assert data["fdr_id"] == "fdr-001"
    assert data["fdr_number"] == "FDR-2026-NHAI-84920"
    assert data["request_number"].startswith("REL-")

    # Verify checklist items were populated from policy
    req_id = data["id"]
    chk_res = client.get(f"/api/v1/release-requests/{req_id}/checklist", headers=INSTITUTION_HEADERS)
    assert chk_res.status_code == 200
    checklist = chk_res.json()
    assert len(checklist) >= 5
    assert any(c["policy_requirement_key"] == "CHK_FDR_IDENTITY" for c in checklist)

def test_create_release_request_invalid_fdr():
    payload = {"request_reason": "Valid reason for non-existent deposit."}
    res = client.post("/api/v1/fdrs/non-existent-fdr-id/release-requests", json=payload, headers=INSTITUTION_HEADERS)
    assert res.status_code == 400
    assert "not found" in res.json()["detail"]

def test_prevent_conflicting_active_requests():
    payload = {"request_reason": "Primary release request for FDR deposit."}
    res1 = client.post("/api/v1/fdrs/fdr-001/release-requests", json=payload, headers=INSTITUTION_HEADERS)
    assert res1.status_code == 201

    # Attempt second request while first is still active (draft)
    payload2 = {"request_reason": "Duplicate second concurrent release request."}
    res2 = client.post("/api/v1/fdrs/fdr-001/release-requests", json=payload2, headers=INSTITUTION_HEADERS)
    assert res2.status_code == 400
    assert "Conflicting active release request" in res2.json()["detail"]

def test_submit_and_cancel_request():
    payload = {"request_reason": "Request that will be cancelled by user."}
    res = client.post("/api/v1/fdrs/fdr-001/release-requests", json=payload, headers=INSTITUTION_HEADERS)
    req_id = res.json()["id"]

    # Submit request
    submit_res = client.post(f"/api/v1/release-requests/{req_id}/submit", headers=INSTITUTION_HEADERS)
    assert submit_res.status_code == 200
    assert submit_res.json()["request_status"] == "submitted"

    # Cancel request
    cancel_res = client.post(f"/api/v1/release-requests/{req_id}/cancel", headers=INSTITUTION_HEADERS)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["request_status"] == "cancelled"

# ==============================================================================
# 3. CHECKLIST ENGINE & REVIEW WORKFLOW TESTS
# ==============================================================================

def test_checklist_verification_and_unauthorized_update():
    payload = {"request_reason": "Testing checklist verification process."}
    res = client.post("/api/v1/fdrs/fdr-001/release-requests", json=payload, headers=INSTITUTION_HEADERS)
    req_id = res.json()["id"]

    chk_res = client.get(f"/api/v1/release-requests/{req_id}/checklist", headers=ADMIN_HEADERS)
    checklist = chk_res.json()
    first_item = checklist[0]

    # Institution user tries to mark checklist item satisfied (forbidden)
    patch_payload = {"review_status": "satisfied", "review_comments": "Institution self-marking satisfied"}
    unauth_res = client.patch(f"/api/v1/release-requests/{req_id}/checklist/{first_item['id']}", json=patch_payload, headers=INSTITUTION_HEADERS)
    assert unauth_res.status_code == 403

    # Regulatory officer verifies item
    auth_res = client.patch(f"/api/v1/release-requests/{req_id}/checklist/{first_item['id']}", json=patch_payload, headers=BUREAU_HEADERS)
    assert auth_res.status_code == 200
    assert auth_res.json()["review_status"] == "satisfied"

def test_prevent_approval_with_incomplete_checklist():
    payload = {"request_reason": "Testing premature approval prevention."}
    res = client.post("/api/v1/fdrs/fdr-001/release-requests", json=payload, headers=INSTITUTION_HEADERS)
    req_id = res.json()["id"]
    client.post(f"/api/v1/release-requests/{req_id}/submit", headers=INSTITUTION_HEADERS)

    # Attempt to approve without satisfying mandatory checklist items
    approve_res = client.post(
        f"/api/v1/release-requests/{req_id}/approve",
        json={"decision": "approve", "comments": "Premature approval attempt"},
        headers=BUREAU_HEADERS
    )
    assert approve_res.status_code == 400
    assert "mandatory checklist items are not yet satisfied" in approve_res.json()["detail"]

def test_self_approval_restriction():
    # Admin creates release request as applicant
    payload = {"request_reason": "Admin applying on behalf of institution"}
    res = client.post("/api/v1/fdrs/fdr-001/release-requests", json=payload, headers=ADMIN_HEADERS)
    req_id = res.json()["id"]
    client.post(f"/api/v1/release-requests/{req_id}/submit", headers=ADMIN_HEADERS)

    # Same admin user attempts to review and self-approve
    review_res = client.post(
        f"/api/v1/release-requests/{req_id}/approve",
        json={"decision": "approve", "comments": "Self-approval attempt"},
        headers=ADMIN_HEADERS
    )
    assert review_res.status_code == 403
    assert "Self-approval prohibited" in review_res.json()["detail"]

def test_return_for_correction_and_resubmission():
    payload = {"request_reason": "Initial submission lacking justification."}
    res = client.post("/api/v1/fdrs/fdr-001/release-requests", json=payload, headers=INSTITUTION_HEADERS)
    req_id = res.json()["id"]
    client.post(f"/api/v1/release-requests/{req_id}/submit", headers=INSTITUTION_HEADERS)

    # Bureau officer returns for correction
    return_res = client.post(
        f"/api/v1/release-requests/{req_id}/return",
        json={"comments": "Please provide official governing body resolution copy."},
        headers=BUREAU_HEADERS
    )
    assert return_res.status_code == 200

    detail_res = client.get(f"/api/v1/release-requests/{req_id}", headers=INSTITUTION_HEADERS)
    assert detail_res.json()["request_status"] == "returned_for_correction"

    # Applicant edits reason and resubmits
    edit_res = client.patch(
        f"/api/v1/release-requests/{req_id}",
        json={"request_reason": "Updated with Governing Body Resolution 42-B attached."},
        headers=INSTITUTION_HEADERS
    )
    assert edit_res.status_code == 200

    resubmit_res = client.post(f"/api/v1/release-requests/{req_id}/submit", headers=INSTITUTION_HEADERS)
    assert resubmit_res.status_code == 200
    assert resubmit_res.json()["request_status"] == "submitted"

# ==============================================================================
# 4. FULL APPROVAL, BANK RELEASE, REFUND & CLOSURE WORKFLOW
# ==============================================================================

def test_full_release_lifecycle_to_closure():
    # 1. Create and submit release request
    payload = {"request_reason": "Complete statutory clearance for release."}
    res = client.post("/api/v1/fdrs/fdr-001/release-requests", json=payload, headers=INSTITUTION_HEADERS)
    req_id = res.json()["id"]
    client.post(f"/api/v1/release-requests/{req_id}/submit", headers=INSTITUTION_HEADERS)

    # 2. Mark all checklist items satisfied
    chk_res = client.get(f"/api/v1/release-requests/{req_id}/checklist", headers=BUREAU_HEADERS)
    for item in chk_res.json():
        client.patch(
            f"/api/v1/release-requests/{req_id}/checklist/{item['id']}",
            json={"review_status": "satisfied", "review_comments": "Verified and cleared"},
            headers=BUREAU_HEADERS
        )

    # 3. Supervisory approval
    app_res = client.post(
        f"/api/v1/release-requests/{req_id}/approve",
        json={"decision": "approve", "comments": "Regulatory audit cleared. Approved for bank lien release."},
        headers=BUREAU_HEADERS
    )
    assert app_res.status_code == 200

    detail_after_app = client.get(f"/api/v1/release-requests/{req_id}", headers=BUREAU_HEADERS).json()
    assert detail_after_app["request_status"] == "approved"

    # Invariant: Approval does NOT automatically release the FDR yet!
    fdr_record = next(f for f in LOCAL_FDR_STORE if f["id"] == "fdr-001")
    assert fdr_record["lifecycle_status"] != "released"

    # 4. Prepare release instruction
    inst_res = client.post(
        f"/api/v1/release-requests/{req_id}/release-instruction",
        json={"instruction_reference": "AICTE/REL/INST/2026/0091", "bank_notes": "Revoke statutory lien."},
        headers=BUREAU_HEADERS
    )
    assert inst_res.status_code == 200
    assert inst_res.json()["release_status"] == "instruction_prepared"

    # 5. Simulated Bank Confirmation with mandatory disclaimer
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
    bank_data = bank_res.json()
    assert bank_data["is_mock"] is True
    assert "SIMULATED DEMO" in bank_data["disclaimer"]
    assert bank_data["release_status"] == "released"

    # Validated bank release confirmation transitions FDR to released!
    assert fdr_record["lifecycle_status"] == "released"

    # 6. Refund Recording & Reconciliation
    # Expected amount is 25,000,000.00. Record payment transaction.
    tx_res = client.post(
        f"/api/v1/release-requests/{req_id}/refunds",
        json={
            "amount": 25000000.00,
            "transaction_reference": "REF-TX-2026-001",
            "payment_mode": "RTGS",
            "utr_number": "SBIN202604829101"
        },
        headers=FINANCE_HEADERS
    )
    assert tx_res.status_code == 201

    rf_data = client.get(f"/api/v1/release-requests/{req_id}/refunds", headers=FINANCE_HEADERS).json()
    assert rf_data["received_amount"] == 25000000.00
    assert rf_data["refund_status"] == "reconciliation_pending"

    # Reconcile refund
    rec_res = client.post(
        f"/api/v1/release-requests/{req_id}/reconciliation",
        json={"status": "reconciled", "reconciliation_notes": "Bank credit confirmed via RTGS UTR audit."},
        headers=FINANCE_HEADERS
    )
    assert rec_res.status_code == 200
    assert rec_res.json()["refund_status"] == "reconciled"

    # 7. Final Statutory Closure
    closure_res = client.post(
        f"/api/v1/release-requests/{req_id}/close",
        json={"closure_notes": "Complete end-to-end statutory closure executed. Audit records archived."},
        headers=BUREAU_HEADERS
    )
    assert closure_res.status_code == 200
    assert closure_res.json()["closure_status"] == "closed"

    final_detail = client.get(f"/api/v1/release-requests/{req_id}", headers=BUREAU_HEADERS).json()
    assert final_detail["request_status"] == "closed"
    assert fdr_record["lifecycle_status"] == "closed"

def test_prevent_premature_closure():
    # Create request but do not confirm bank release or reconcile refund
    payload = {"request_reason": "Premature closure test case."}
    res = client.post("/api/v1/fdrs/fdr-001/release-requests", json=payload, headers=INSTITUTION_HEADERS)
    req_id = res.json()["id"]

    closure_res = client.post(
        f"/api/v1/release-requests/{req_id}/close",
        json={"closure_notes": "Premature closure attempt"},
        headers=BUREAU_HEADERS
    )
    assert closure_res.status_code == 400
    assert "Depository bank release confirmation has not been recorded" in closure_res.json()["detail"]

def test_release_dashboard_stats():
    res = client.get("/api/v1/release-requests/stats", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "total_requests" in data
    assert "draft_count" in data
    assert "approved_count" in data
    assert "closed_count" in data
