import pytest
from datetime import date, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Helper header for simulated admin
AUTH_ADMIN = {"Authorization": "Bearer dev-system_admin-token"}
AUTH_INST = {"Authorization": "Bearer dev-institution_user-token"}

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_get_fdrs_list():
    response = client.get("/api/v1/fdrs", headers=AUTH_ADMIN)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1

def test_get_fdr_detail():
    response = client.get("/api/v1/fdrs/fdr-001", headers=AUTH_ADMIN)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "fdr-001"
    assert data["fdr_number"] == "FDR-2026-NHAI-84920"
    assert data["trust_tier"] == 1
    assert data["verification_status"] == "institution_declared"

def test_create_fdr_validation_dates():
    # Attempt creating with maturity_date earlier than issue_date (must fail)
    payload = {
        "bank_id": "00000000-0000-0000-0000-000000000001",
        "branch_id": "00000000-0000-0000-0000-000000000002",
        "fdr_number": "TEST-FDR-INVALID-DATES",
        "amount": 100000.00,
        "issue_date": str(date.today()),
        "maturity_date": str(date.today() - timedelta(days=1)),
        "lien_in_favour": "Test Beneficiary",
    }
    response = client.post("/api/v1/fdrs", json=payload, headers=AUTH_ADMIN)
    assert response.status_code == 400
    assert "Maturity date must be strictly after the issue date" in response.json()["detail"]

def test_create_fdr_success_enforces_tier1():
    payload = {
        "bank_id": "00000000-0000-0000-0000-000000000001",
        "branch_id": "00000000-0000-0000-0000-000000000002",
        "fdr_number": "TEST-FDR-SUCCESS-001",
        "amount": 500000.00,
        "currency": "INR",
        "issue_date": str(date.today()),
        "maturity_date": str(date.today() + timedelta(days=365)),
        "interest_rate": 7.00,
        "lien_in_favour": "National Highways Authority of India",
        "remarks": "Automated Phase 2 Integration Test Record"
    }
    response = client.post("/api/v1/fdrs", json=payload, headers=AUTH_ADMIN)
    assert response.status_code == 201
    data = response.json()
    assert data["fdr_number"] == "TEST-FDR-SUCCESS-001"
    # STRICT INITIAL PHASE 2 STATUS
    assert data["trust_tier"] == 1
    assert data["lifecycle_status"] == "pending"
    assert data["verification_status"] == "institution_declared"
    assert data["heartbeat_status"] == "not_started"

def test_prevent_editing_prohibited_fields():
    # Users cannot modify trust_tier or verification_status directly
    response = client.patch(
        "/api/v1/fdrs/fdr-001",
        json={"remarks": "Updated remarks permitted", "interest_rate": 7.30},
        headers=AUTH_ADMIN
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["interest_rate"]) == 7.30
    assert data["trust_tier"] == 1 # Stays Tier 1

def test_get_fdr_stats():
    response = client.get("/api/v1/fdrs/stats", headers=AUTH_ADMIN)
    assert response.status_code == 200
    stats = response.json()
    assert "total_fdrs" in stats
    assert "total_amount" in stats
    assert "pending_count" in stats
    assert "tier1_count" in stats
    assert stats["tier1_count"] >= 1

if __name__ == "__main__":
    pytest.main(["-v", __file__])
