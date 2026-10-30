import pytest
import io
import openpyxl
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

ADMIN_HEADERS = {"Authorization": "Bearer dev-system_admin-token"}
INSTITUTION_HEADERS = {"Authorization": "Bearer dev-institution_user-token"}
BUREAU_HEADERS = {"Authorization": "Bearer dev-bureau_officer-token"}

# ==============================================================================
# MODULE A: LEGACY DATA MIGRATION TESTS
# ==============================================================================

def test_csv_upload_success():
    csv_content = """Institution Name,Bank Name,Branch,FDR No,Deposit Amount,Currency,Date of Issue,Date of Maturity,Interest Rate,Lien In Favour,Remarks
National Highways Authority of India,State Bank of India,SBI Main,MIG-CSV-2026-001,1500000,INR,2026-01-01,2027-01-01,7.2,AICTE,Legacy Package 1
National Highways Authority of India,Punjab National Bank,PNB Main,MIG-CSV-2026-002,2500000,INR,2026-02-01,2027-02-01,7.4,AICTE,Legacy Package 2
"""
    files = {"file": ("legacy_deposits.csv", csv_content.encode("utf-8"), "text/csv")}
    response = client.post("/api/v1/migrations/upload", files=files, headers=ADMIN_HEADERS)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["file_type"] == "csv"
    assert data["total_rows"] == 2
    assert data["batch_status"] == "uploaded"

def test_xlsx_upload_success():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Institution Name", "Bank Name", "Branch", "FDR No", "Deposit Amount", "Currency", "Date of Issue", "Date of Maturity", "Interest Rate", "Lien In Favour", "Remarks"])
    ws.append(["National Highways Authority of India", "Canara Bank", "Connaught Place", "MIG-XLSX-2026-001", 3000000, "INR", "2026-03-01", "2027-03-01", 7.1, "AICTE", "XLSX Package 1"])
    out = io.BytesIO()
    wb.save(out)
    xlsx_bytes = out.getvalue()

    files = {"file": ("legacy_test.xlsx", xlsx_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = client.post("/api/v1/migrations/upload", files=files, headers=ADMIN_HEADERS)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["file_type"] == "xlsx"
    assert data["total_rows"] == 1

def test_upload_invalid_file_type():
    files = {"file": ("malicious.exe", b"MZDummyBinary", "application/octet-stream")}
    response = client.post("/api/v1/migrations/upload", files=files, headers=ADMIN_HEADERS)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_upload_empty_file():
    files = {"file": ("empty.csv", b"", "text/csv")}
    response = client.post("/api/v1/migrations/upload", files=files, headers=ADMIN_HEADERS)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]

def test_column_mapping_and_validation():
    csv_content = """Institution Name,Bank Name,Branch,FDR No,Deposit Amount,Currency,Date of Issue,Date of Maturity,Interest Rate,Lien In Favour,Remarks
National Highways Authority of India,State Bank of India,Main,MIG-VAL-001,1000000,INR,2026-01-01,2027-01-01,7.0,AICTE,Valid
National Highways Authority of India,State Bank of India,Main,MIG-VAL-ERR-002,-5000,INR,2026-01-01,2027-01-01,7.0,AICTE,Negative Amount
National Highways Authority of India,State Bank of India,Main,MIG-VAL-DATE-003,500000,INR,2027-01-01,2026-01-01,7.0,AICTE,Maturity Before Issue
"""
    files = {"file": ("test_val.csv", csv_content.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/migrations/upload", files=files, headers=ADMIN_HEADERS)
    assert upload_res.status_code == 200
    batch_id = upload_res.json()["id"]

    # Set column mapping
    mapping_payload = {
        "mappings": [
            {"source_column": "Institution Name", "target_field": "institution_name"},
            {"source_column": "Bank Name", "target_field": "bank_name"},
            {"source_column": "Branch", "target_field": "branch_name"},
            {"source_column": "FDR No", "target_field": "fdr_number"},
            {"source_column": "Deposit Amount", "target_field": "amount"},
            {"source_column": "Currency", "target_field": "currency"},
            {"source_column": "Date of Issue", "target_field": "issue_date"},
            {"source_column": "Date of Maturity", "target_field": "maturity_date"},
            {"source_column": "Interest Rate", "target_field": "interest_rate"},
            {"source_column": "Lien In Favour", "target_field": "lien_in_favour"},
            {"source_column": "Remarks", "target_field": "remarks"},
        ]
    }
    map_res = client.post(f"/api/v1/migrations/{batch_id}/mapping", json=mapping_payload, headers=ADMIN_HEADERS)
    assert map_res.status_code == 200

    # Run validation
    val_res = client.post(f"/api/v1/migrations/{batch_id}/validate", headers=ADMIN_HEADERS)
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["valid_rows"] == 1
    assert val_data["invalid_rows"] == 2
    assert val_data["status"] == "review_required"

    # Query errors endpoint
    err_res = client.get(f"/api/v1/migrations/{batch_id}/errors", headers=ADMIN_HEADERS)
    assert err_res.status_code == 200
    errors = err_res.json()
    assert len(errors) == 2

def test_row_correction_and_review():
    csv_content = """FDR No,Deposit Amount,Date of Issue,Date of Maturity
MIG-CORR-001,-1000,2026-01-01,2027-01-01
"""
    files = {"file": ("corr.csv", csv_content.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/migrations/upload", files=files, headers=ADMIN_HEADERS)
    batch_id = upload_res.json()["id"]

    mapping_payload = {
        "mappings": [
            {"source_column": "FDR No", "target_field": "fdr_number"},
            {"source_column": "Deposit Amount", "target_field": "amount"},
            {"source_column": "Date of Issue", "target_field": "issue_date"},
            {"source_column": "Date of Maturity", "target_field": "maturity_date"},
        ]
    }
    client.post(f"/api/v1/migrations/{batch_id}/mapping", json=mapping_payload, headers=ADMIN_HEADERS)
    client.post(f"/api/v1/migrations/{batch_id}/validate", headers=ADMIN_HEADERS)

    # Get rows
    batch_detail = client.get(f"/api/v1/migrations/{batch_id}", headers=ADMIN_HEADERS).json()
    row_id = batch_detail["rows"][0]["id"]
    assert batch_detail["rows"][0]["validation_status"] == "invalid"

    # Correct row
    correct_payload = {
        "action": "correct",
        "corrected_data": {"amount": 5000000.0},
        "review_note": "Corrected negative typo from scanning record."
    }
    review_res = client.post(f"/api/v1/migrations/{batch_id}/rows/{row_id}/review", json=correct_payload, headers=ADMIN_HEADERS)
    assert review_res.status_code == 200
    assert review_res.json()["validation_status"] == "reviewed"
    assert review_res.json()["normalized_data"]["amount"] == 5000000.0

def test_import_execution_enforces_tier1_and_idempotence():
    csv_content = """Institution Name,Bank Name,Branch,FDR No,Deposit Amount,Currency,Date of Issue,Date of Maturity,Interest Rate,Lien In Favour,Remarks
National Highways Authority of India,State Bank of India,SBI Main,MIG-IMPORT-TIER1-001,7500000,INR,2026-01-10,2027-01-10,7.1,AICTE,Legacy Road Package
"""
    files = {"file": ("import_tier1.csv", csv_content.encode("utf-8"), "text/csv")}
    upload_res = client.post("/api/v1/migrations/upload", files=files, headers=ADMIN_HEADERS)
    batch_id = upload_res.json()["id"]

    mapping_payload = {
        "mappings": [
            {"source_column": "Institution Name", "target_field": "institution_name"},
            {"source_column": "Bank Name", "target_field": "bank_name"},
            {"source_column": "Branch", "target_field": "branch_name"},
            {"source_column": "FDR No", "target_field": "fdr_number"},
            {"source_column": "Deposit Amount", "target_field": "amount"},
            {"source_column": "Currency", "target_field": "currency"},
            {"source_column": "Date of Issue", "target_field": "issue_date"},
            {"source_column": "Date of Maturity", "target_field": "maturity_date"},
            {"source_column": "Interest Rate", "target_field": "interest_rate"},
            {"source_column": "Lien In Favour", "target_field": "lien_in_favour"},
            {"source_column": "Remarks", "target_field": "remarks"},
        ]
    }
    client.post(f"/api/v1/migrations/{batch_id}/mapping", json=mapping_payload, headers=ADMIN_HEADERS)
    client.post(f"/api/v1/migrations/{batch_id}/validate", headers=ADMIN_HEADERS)

    # First import
    import_res = client.post(f"/api/v1/migrations/{batch_id}/import", headers=ADMIN_HEADERS)
    assert import_res.status_code == 200
    assert import_res.json()["status"] == "completed"
    assert import_res.json()["imported_count"] == 1

    # Verify newly created FDR has Trust Tier 1 and pending status
    fdr_list = client.get("/api/v1/fdrs?search=MIG-IMPORT-TIER1-001", headers=ADMIN_HEADERS).json()
    imported_items = [f for f in fdr_list["items"] if f["fdr_number"] == "MIG-IMPORT-TIER1-001"]
    assert len(imported_items) == 1
    imported_fdr = imported_items[0]
    assert imported_fdr["trust_tier"] == 1
    assert imported_fdr["verification_status"] == "institution_declared"
    assert imported_fdr["lifecycle_status"] == "pending"
    assert imported_fdr["heartbeat_status"] == "not_started"

    # Second import execution (Idempotence Guarantee)
    second_import = client.post(f"/api/v1/migrations/{batch_id}/import", headers=ADMIN_HEADERS)
    assert second_import.status_code == 200
    assert second_import.json()["status"] == "already_completed"

    # Verify no duplicate FDR created
    fdr_list_again = client.get("/api/v1/fdrs?search=MIG-IMPORT-TIER1-001", headers=ADMIN_HEADERS).json()
    assert len([f for f in fdr_list_again["items"] if f["fdr_number"] == "MIG-IMPORT-TIER1-001"]) == 1

# ==============================================================================
# MODULE B: COMPLIANCE DOCUMENT TESTS
# ==============================================================================

def test_list_and_create_compliance_template():
    # List initial templates
    res = client.get("/api/v1/compliance/templates", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    templates = res.json()
    assert len(templates) >= 6

    # Create new custom template (Admin allowed)
    new_tpl_payload = {
        "template_name": "Special Directorate Audit Summons",
        "template_type": "compliance_clarification",
        "description": "Special audit summons letter for discrepancy inquiry.",
        "template_content": "REF: SPECIAL/{{fdr_number}}\nTo: {{institution_name}}\nPlease attend hearing."
    }
    create_res = client.post("/api/v1/compliance/templates", json=new_tpl_payload, headers=ADMIN_HEADERS)
    assert create_res.status_code == 200
    tpl_data = create_res.json()
    assert tpl_data["template_name"] == "Special Directorate Audit Summons"
    assert tpl_data["version"] == 1

def test_unauthorized_template_creation_denied():
    payload = {
        "template_name": "Rogue Template",
        "template_type": "fdr_confirmation",
        "template_content": "Unauthorized content"
    }
    # Institution user cannot create compliance templates
    res = client.post("/api/v1/compliance/templates", json=payload, headers=INSTITUTION_HEADERS)
    assert res.status_code == 403

def _create_test_compliance_doc() -> str:
    gen_payload = {
        "template_id": "template-001",
        "institution_id": "inst-01",
        "fdr_id": "fdr-001",
        "custom_title": "Official Confirmation - NHAI Security Deposit Package 4"
    }
    gen_res = client.post("/api/v1/compliance/documents/generate", json=gen_payload, headers=ADMIN_HEADERS)
    assert gen_res.status_code == 200
    return gen_res.json()["id"]

def test_generate_compliance_document_from_fdr():
    doc_id = _create_test_compliance_doc()
    doc_res = client.get(f"/api/v1/compliance/documents/{doc_id}", headers=ADMIN_HEADERS)
    assert doc_res.status_code == 200
    doc = doc_res.json()
    assert doc["document_status"] == "draft"
    assert doc["current_version"] == 1
    assert "FDR-2026-NHAI-84920" in doc["content_text"]
    assert "National Highways Authority of India" in doc["content_text"]

def test_edit_draft_creates_version_snapshot():
    doc_id = _create_test_compliance_doc()

    # Edit draft
    patch_payload = {
        "document_title": "Revised Confirmation - Package 4",
        "content_text": "Amended official text: Deposit verified on CBS ledger."
    }
    patch_res = client.patch(f"/api/v1/compliance/documents/{doc_id}", json=patch_payload, headers=ADMIN_HEADERS)
    assert patch_res.status_code == 200
    doc = patch_res.json()
    assert doc["current_version"] == 2
    assert "Amended official text" in doc["content_text"]

    # Check version history
    vers_res = client.get(f"/api/v1/compliance/documents/{doc_id}/versions", headers=ADMIN_HEADERS)
    assert vers_res.status_code == 200
    versions = vers_res.json()
    assert len(versions) == 2
    assert versions[1]["version_number"] == 2

def test_compliance_document_review_workflow():
    doc_id = _create_test_compliance_doc()

    # Submit for review
    sub_res = client.post(f"/api/v1/compliance/documents/{doc_id}/submit-review", headers=ADMIN_HEADERS)
    assert sub_res.status_code == 200
    assert sub_res.json()["document_status"] == "submitted_for_review"

    # Non-supervisor cannot approve review
    inst_review = client.post(
        f"/api/v1/compliance/documents/{doc_id}/review",
        json={"action": "approved", "comments": "Rogue approval"},
        headers=INSTITUTION_HEADERS
    )
    assert inst_review.status_code == 403

    # Bureau officer approves review
    appr_payload = {"action": "approved", "comments": "Collateral and deposit verified in compliance with APH rules."}
    appr_res = client.post(f"/api/v1/compliance/documents/{doc_id}/review", json=appr_payload, headers=BUREAU_HEADERS)
    assert appr_res.status_code == 200
    assert appr_res.json()["document_status"] == "approved"

    # Finalize PDF
    fin_res = client.post(f"/api/v1/compliance/documents/{doc_id}/finalize", headers=ADMIN_HEADERS)
    assert fin_res.status_code == 200
    assert fin_res.json()["status"] == "finalized"
    assert fin_res.json()["size_bytes"] > 0

    # Download PDF
    pdf_res = client.get(f"/api/v1/compliance/documents/{doc_id}/pdf", headers=ADMIN_HEADERS)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"

def test_mock_esign_demonstration_with_mandatory_disclaimer():
    doc_id = _create_test_compliance_doc()

    # Submit & approve first
    client.post(f"/api/v1/compliance/documents/{doc_id}/submit-review", headers=ADMIN_HEADERS)
    client.post(
        f"/api/v1/compliance/documents/{doc_id}/review",
        json={"action": "approved", "comments": "Approved for signing demonstration"},
        headers=BUREAU_HEADERS
    )

    # Perform Mock E-Sign
    sign_payload = {
        "signer_display_name": "Dr. Rajeshwar Sharma (System Administrator)",
        "consent_acknowledged": True
    }
    sign_res = client.post(f"/api/v1/compliance/documents/{doc_id}/mock-sign", json=sign_payload, headers=ADMIN_HEADERS)
    assert sign_res.status_code == 200
    sig_data = sign_res.json()
    assert sig_data["signature_reference"].startswith("MOCK-SIG-")
    assert sig_data["status"] == "demonstration_only"
    # Mandatory disclaimer verification
    assert sig_data["disclaimer"] == "DEMO — NOT A LEGALLY VALID DIGITAL SIGNATURE"

    # Verify updated document text includes the disclaimer
    doc_detail = client.get(f"/api/v1/compliance/documents/{doc_id}", headers=ADMIN_HEADERS).json()
    assert "DEMO — NOT A LEGALLY VALID DIGITAL SIGNATURE" in doc_detail["content_text"]
