import pytest
import io
from datetime import date, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.services.fdr_service import LOCAL_FDR_STORE
from app.services.renewal_service import LOCAL_RENEWAL_CASES, LOCAL_FDR_LINEAGE, LOCAL_RENEWAL_EVIDENCE

client = TestClient(app)

# Authentication token simulation headers
AUTH_ADMIN = {"Authorization": "Bearer dev-system_admin-token"}
AUTH_INST1 = {"Authorization": "Bearer dev-institution_user-token"}
AUTH_INST2 = {"Authorization": "Bearer dev-cpwd_user-token"}
AUTH_BANK = {"Authorization": "Bearer dev-bank_nodal_officer-token"}

# -------------------------------------------------------------
# 1. RENEWAL CASES TESTS
# -------------------------------------------------------------

def test_create_renewal_draft():
    """Verify creating a draft renewal case with valid original FDR."""
    payload = {
        "proposed_replacement_fdr_id": "fdr-005",
        "submission_notes": "Initiating annual renewal test case for NHAI"
    }
    response = client.post("/api/v1/fdrs/fdr-001/renewals", json=payload, headers=AUTH_ADMIN)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "draft"
    assert data["original_fdr_id"] == "fdr-001"
    assert data["proposed_replacement_fdr_id"] == "fdr-005"
    assert "case_number" in data


def test_edit_draft_case():
    """Verify that a draft renewal case can be edited."""
    # Create draft
    create_res = client.post("/api/v1/fdrs/fdr-001/renewals", json={"submission_notes": "Initial draft"}, headers=AUTH_ADMIN)
    case_id = create_res.json()["id"]

    # Edit draft
    update_res = client.patch(f"/api/v1/renewals/{case_id}", json={
        "proposed_replacement_fdr_id": "fdr-005",
        "submission_notes": "Updated draft notes with replacement attached"
    }, headers=AUTH_ADMIN)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["proposed_replacement_fdr_id"] == "fdr-005"
    assert "Updated draft notes" in updated_data["submission_notes"]


def test_submit_draft_case():
    """Verify submitting a draft case transitions status to 'under_review'."""
    create_res = client.post("/api/v1/fdrs/fdr-001/renewals", json={
        "proposed_replacement_fdr_id": "fdr-005",
        "submission_notes": "Ready for submission"
    }, headers=AUTH_ADMIN)
    case_id = create_res.json()["id"]

    submit_res = client.post(f"/api/v1/renewals/{case_id}/submit", json={
        "submission_notes": "Final submission by institutional officer"
    }, headers=AUTH_ADMIN)
    assert submit_res.status_code == 200
    data = submit_res.json()
    assert data["status"] == "under_review"
    assert data["submitted_at"] is not None


def test_prevent_editing_non_draft_case():
    """Verify that cases in 'under_review' or final states cannot be edited."""
    create_res = client.post("/api/v1/fdrs/fdr-001/renewals", json={
        "proposed_replacement_fdr_id": "fdr-005",
        "submission_notes": "Testing immutability"
    }, headers=AUTH_ADMIN)
    case_id = create_res.json()["id"]

    # Submit to move out of draft
    client.post(f"/api/v1/renewals/{case_id}/submit", json={}, headers=AUTH_ADMIN)

    # Attempt edit
    patch_res = client.patch(f"/api/v1/renewals/{case_id}", json={"submission_notes": "Illegal edit attempt"}, headers=AUTH_ADMIN)
    assert patch_res.status_code == 400
    assert "Edits are only permitted on draft cases" in patch_res.json()["detail"]


def test_prevent_cross_institution_renewal():
    """Verify that referencing an FDR from another institution is strictly blocked."""
    # fdr-001 belongs to inst-01 (NHAI); fdr-002 belongs to inst-02 (CPWD)
    payload = {
        "proposed_replacement_fdr_id": "fdr-002",
        "submission_notes": "Cross institution renewal attempt"
    }
    response = client.post("/api/v1/fdrs/fdr-001/renewals", json=payload, headers=AUTH_ADMIN)
    assert response.status_code == 400
    assert "Cross-institution renewal prohibited" in response.json()["detail"]


# -------------------------------------------------------------
# 2. MATCHING ENGINE TESTS
# -------------------------------------------------------------

def test_candidate_matching_high_score():
    """Verify that matching identical bank and amount yields a high score."""
    response = client.get("/api/v1/renewals/case-001/matches", headers=AUTH_ADMIN)
    assert response.status_code == 200
    data = response.json()
    assert "candidates" in data
    assert len(data["candidates"]) >= 1
    top_candidate = data["candidates"][0]
    # fdr-005 has identical bank, branch, amount, lien as fdr-001
    assert top_candidate["candidate_fdr_id"] == "fdr-005"
    assert top_candidate["score"] >= 80
    assert len(top_candidate["matching_factors"]) >= 4


def test_candidate_matching_advisory_only():
    """Verify running matching never alters case status or commits lineage."""
    case_before = client.get("/api/v1/renewals/case-002", headers=AUTH_ADMIN).json()
    status_before = case_before["status"]

    match_res = client.post("/api/v1/renewals/case-002/match", headers=AUTH_ADMIN)
    assert match_res.status_code == 200
    assert match_res.json()["advisory_notice"] is not None

    case_after = client.get("/api/v1/renewals/case-002", headers=AUTH_ADMIN).json()
    assert case_after["status"] == status_before


# -------------------------------------------------------------
# 3. EVIDENCE UPLOAD TESTS
# -------------------------------------------------------------

def test_upload_renewal_evidence_success():
    """Verify uploading a valid PDF evidence file registers metadata and SHA-256."""
    pdf_content = b"%PDF-1.4 Mock renewal advice document for NHAI fdr renewal"
    files = {"file": ("sbi_advice.pdf", io.BytesIO(pdf_content), "application/pdf")}
    data = {"evidence_type": "bank_renewal_advice", "description": "Branch official letter"}

    response = client.post("/api/v1/renewals/case-002/evidence", data=data, files=files, headers=AUTH_ADMIN)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["evidence_type"] == "bank_renewal_advice"
    assert len(res_data["sha256_checksum"]) == 64
    assert res_data["file_name"] == "sbi_advice.pdf"


def test_prevent_invalid_mime_type_evidence():
    """Verify uploading disallowed file types (e.g. .exe or .sh) is rejected."""
    bad_content = b"echo 'hack'"
    files = {"file": ("exploit.sh", io.BytesIO(bad_content), "application/x-sh")}
    data = {"evidence_type": "other_supporting_document"}

    response = client.post("/api/v1/renewals/case-002/evidence", data=data, files=files, headers=AUTH_ADMIN)
    assert response.status_code == 400
    assert "Unsupported file MIME type" in response.json()["detail"]


# -------------------------------------------------------------
# 4. APPROVAL & REJECTION TESTS
# -------------------------------------------------------------

def test_prevent_unauthorized_approval():
    """Verify that regular institutional users cannot approve renewal cases."""
    payload = {"decision_notes": "Approving as inst user"}
    response = client.post("/api/v1/renewals/case-002/approve", json=payload, headers=AUTH_INST1)
    assert response.status_code == 403
    assert "Unauthorized" in response.json()["detail"]


def test_prevent_duplicate_approval():
    """Verify that an already approved case cannot be re-approved."""
    payload = {"decision_notes": "Attempting second approval on case-001"}
    response = client.post("/api/v1/renewals/case-001/approve", json=payload, headers=AUTH_ADMIN)
    assert response.status_code == 400
    assert "Duplicate approval prohibited" in response.json()["detail"]


def test_renewal_rejection_requires_reason():
    """Verify rejection fails without adequate justification, and succeeds with valid note."""
    # Missing / empty reason
    response_empty = client.post("/api/v1/renewals/case-003/reject", json={"rejection_reason": "no"}, headers=AUTH_ADMIN)
    assert response_empty.status_code == 422  # Pydantic min_length=5

    # Valid rejection
    response_valid = client.post("/api/v1/renewals/case-003/reject", json={
        "rejection_reason": "Replacement FDR deposit voucher date precedes original issue date by 2 years"
    }, headers=AUTH_ADMIN)
    assert response_valid.status_code == 200
    data = response_valid.json()
    assert data["status"] == "rejected"
    assert "REJECTED" in data["decision_notes"]


# -------------------------------------------------------------
# 5. LINEAGE INTEGRITY & GRAPH TRAVERSAL TESTS
# -------------------------------------------------------------

def test_lineage_graph_traversal():
    """Verify traversing lineage graph returns complete DAG nodes and edges."""
    response = client.get("/api/v1/fdrs/fdr-001/lineage", headers=AUTH_ADMIN)
    assert response.status_code == 200
    data = response.json()
    assert data["root_fdr_id"] == "fdr-001"
    assert data["total_nodes"] >= 2
    assert data["total_edges"] >= 1
    assert data["has_cycles"] is False

    # Check root node generation level 0 and child level 1
    root_node = next(n for n in data["nodes"] if n["fdr_id"] == "fdr-001")
    assert root_node["generation_level"] == 0

    child_node = next(n for n in data["nodes"] if n["fdr_id"] == "fdr-005")
    assert child_node["generation_level"] == 1


def test_prevent_lineage_self_link():
    """Verify self-links (parent == child) are strictly blocked."""
    payload = {
        "proposed_replacement_fdr_id": "fdr-001",
        "submission_notes": "Self link test"
    }
    response = client.post("/api/v1/fdrs/fdr-001/renewals", json=payload, headers=AUTH_ADMIN)
    assert response.status_code == 400
    assert "Original FDR cannot be its own proposed replacement" in response.json()["detail"]


def test_prevent_conflicting_predecessor():
    """Verify a replacement FDR cannot have multiple parent predecessors."""
    # fdr-005 already has predecessor fdr-001 in lineage-001
    # Create another FDR in inst-01 to attempt linking to fdr-005
    LOCAL_FDR_STORE.append({
        "id": "fdr-test-prev",
        "institution_id": "inst-01",
        "bank_id": "bank-01",
        "fdr_number": "FDR-TEST-PREV",
        "amount": Decimal("25000000.00"),
        "currency": "INR",
        "issue_date": date(2025, 1, 1),
        "maturity_date": date(2026, 1, 1),
        "lifecycle_status": "active",
        "trust_tier": 2,
        "verification_status": "bank_confirmed",
    })

    create_res = client.post("/api/v1/fdrs/fdr-test-prev/renewals", json={
        "proposed_replacement_fdr_id": "fdr-005",
        "submission_notes": "Attempting conflicting predecessor"
    }, headers=AUTH_ADMIN)
    new_case_id = create_res.json()["id"]

    # Attach evidence so approval proceeds to predecessor check
    pdf_content = b"%PDF-1.4 Mock advice"
    client.post(f"/api/v1/renewals/{new_case_id}/evidence", data={"evidence_type": "bank_renewal_advice"}, files={"file": ("advice.pdf", io.BytesIO(pdf_content), "application/pdf")}, headers=AUTH_ADMIN)

    # Approve
    approve_res = client.post(f"/api/v1/renewals/{new_case_id}/approve", json={"decision_notes": "Should fail"}, headers=AUTH_ADMIN)
    assert approve_res.status_code == 400
    assert "Conflicting predecessor" in approve_res.json()["detail"]


def test_prevent_lineage_cycles():
    """Verify that circular lineage dependencies (child -> parent) are rejected."""
    # fdr-001 -> fdr-005 exists. Attempting to approve fdr-005 -> fdr-001 must detect cycle!
    create_res = client.post("/api/v1/fdrs/fdr-005/renewals", json={
        "proposed_replacement_fdr_id": "fdr-001",
        "submission_notes": "Cycle attempt"
    }, headers=AUTH_ADMIN)
    cycle_case_id = create_res.json()["id"]

    # Attach evidence
    pdf_content = b"%PDF-1.4 Mock advice"
    client.post(f"/api/v1/renewals/{cycle_case_id}/evidence", data={"evidence_type": "bank_renewal_advice"}, files={"file": ("advice.pdf", io.BytesIO(pdf_content), "application/pdf")}, headers=AUTH_ADMIN)

    # Ensure fdr-001 has tier >= 2 for the bank verif check so cycle check is reached
    fdr_001 = next(f for f in LOCAL_FDR_STORE if f["id"] == "fdr-001")
    old_tier = fdr_001.get("trust_tier", 1)
    fdr_001["trust_tier"] = 2
    fdr_001["verification_status"] = "bank_confirmed"

    approve_res = client.post(f"/api/v1/renewals/{cycle_case_id}/approve", json={"decision_notes": "Cycle test"}, headers=AUTH_ADMIN)
    # Restore fdr-001 tier
    fdr_001["trust_tier"] = old_tier
    fdr_001["verification_status"] = "institution_declared"

    assert approve_res.status_code == 400
    assert "Lineage cycle detected" in approve_res.json()["detail"]


def test_lineage_isolated_fdr():
    """Verify that an FDR without predecessors or successors returns a valid 1-node graph."""
    response = client.get("/api/v1/fdrs/fdr-002/lineage", headers=AUTH_ADMIN)
    assert response.status_code == 200
    data = response.json()
    assert data["total_nodes"] == 1
    assert data["total_edges"] == 0
    assert data["is_leaf"] is True
    assert data["nodes"][0]["fdr_id"] == "fdr-002"
    assert data["nodes"][0]["generation_level"] == 0


def test_renewal_dashboard_stats():
    """Verify renewal dashboard metrics aggregate accurately."""
    response = client.get("/api/v1/renewals/dashboard/stats", headers=AUTH_ADMIN)
    assert response.status_code == 200
    data = response.json()
    assert "total_cases" in data
    assert "draft_cases" in data
    assert "approved_cases" in data
    assert "recent_cases" in data
    assert data["total_cases"] >= 3
