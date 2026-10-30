import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.services.mock_bank_crypto import MockBankSigningService
from app.services.fdr_service import fdr_service, LOCAL_FDR_STORE

client = TestClient(app)

# Helper headers for authenticated tests using dev token format
INST_USER_HEADERS = {"Authorization": "Bearer dev-institution_user-token"}
BANK_NODAL_HEADERS = {"Authorization": "Bearer dev-bank_nodal_officer-token"}
ADMIN_HEADERS = {"Authorization": "Bearer dev-system_admin-token"}

@pytest.fixture(autouse=True)
def reset_test_state():
    # Ensure fdr-001 is reset to initial state
    for f in LOCAL_FDR_STORE:
        if f["id"] == "fdr-001":
            f["trust_tier"] = 1
            f["verification_status"] = "institution_declared"
            f["amount"] = Decimal("25000000.00")
            f["fdr_number"] = "FDR-2026-NHAI-84920"
            f["maturity_date"] = datetime(2027, 1, 15).date()
    from app.services.verification_service import LOCAL_VERIFICATION_REQUESTS, LOCAL_NONCE_REGISTRY
    LOCAL_VERIFICATION_REQUESTS.clear()
    LOCAL_NONCE_REGISTRY.clear()
    yield

def test_tier1_initial_status():
    """Verify FDR begins strictly at Trust Tier 1 (Institution Declared)"""
    res = client.get("/api/v1/fdrs/fdr-001", headers=INST_USER_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["trust_tier"] == 1
    assert data["verification_status"] == "institution_declared"

def test_tier2_create_verification_request():
    """Test generating a Tier 2 single-use 48h verification token"""
    res = client.post(
        "/api/v1/fdrs/fdr-001/verification-requests",
        headers=INST_USER_HEADERS
    )
    assert res.status_code == 201
    data = res.json()
    assert data["fdr_id"] == "fdr-001"
    assert data["status"] == "pending"
    assert data["raw_token"] is not None
    assert len(data["raw_token"]) >= 32
    assert "verification_url" in data

def test_tier2_prevent_duplicate_pending_request():
    """Invariant: Exactly one pending verification request allowed per FDR"""
    res1 = client.post("/api/v1/fdrs/fdr-001/verification-requests", headers=INST_USER_HEADERS)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/fdrs/fdr-001/verification-requests", headers=INST_USER_HEADERS)
    assert res2.status_code == 400
    assert "already outstanding" in res2.json()["detail"]

def test_tier2_bank_confirm_success():
    """Test bank confirmation promoting FDR to Trust Tier 2 (Bank Confirmed)"""
    # 1. Generate request
    req_res = client.post("/api/v1/fdrs/fdr-001/verification-requests", headers=INST_USER_HEADERS)
    token = req_res.json()["raw_token"]

    # 2. Bank inspects request details
    detail_res = client.get(f"/api/v1/bank/verification/{token}")
    assert detail_res.status_code == 200
    assert detail_res.json()["fdr_number"] == "FDR-2026-NHAI-84920"
    assert detail_res.json()["is_snapshot_valid"] is True
    assert detail_res.json()["is_expired"] is False

    # 3. Bank confirms
    confirm_res = client.post(
        "/api/v1/bank/verification/confirm",
        json={
            "token": token,
            "action": "confirm",
            "officer_name": "Smt. Meenakshi Sundaram",
            "notes": "Verified against SBI Core Banking terminal."
        },
        headers=BANK_NODAL_HEADERS
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["action"] == "confirmed"
    assert confirm_data["trust_tier"] == 2
    assert confirm_data["verification_status"] == "bank_confirmed"

    # 4. Verify FDR was promoted to Trust Tier 2 in repository
    fdr_res = client.get("/api/v1/fdrs/fdr-001", headers=INST_USER_HEADERS)
    assert fdr_res.json()["trust_tier"] == 2
    assert fdr_res.json()["verification_status"] == "bank_confirmed"

def test_tier2_prevent_token_replay():
    """Test that a consumed single-use token cannot be replayed"""
    req_res = client.post("/api/v1/fdrs/fdr-001/verification-requests", headers=INST_USER_HEADERS)
    token = req_res.json()["raw_token"]

    # Consume token
    client.post(
        "/api/v1/bank/verification/confirm",
        json={"token": token, "action": "confirm"},
        headers=BANK_NODAL_HEADERS
    )

    # Replay attempt
    replay_res = client.post(
        "/api/v1/bank/verification/confirm",
        json={"token": token, "action": "confirm"},
        headers=BANK_NODAL_HEADERS
    )
    assert replay_res.status_code == 409
    assert "already been consumed" in replay_res.json()["detail"]

def test_tier2_bank_reject():
    """Test that bank rejection updates verification_status to rejected without increasing tier"""
    req_res = client.post("/api/v1/fdrs/fdr-001/verification-requests", headers=INST_USER_HEADERS)
    token = req_res.json()["raw_token"]

    reject_res = client.post(
        "/api/v1/bank/verification/confirm",
        json={
            "token": token,
            "action": "reject",
            "rejection_reason": "Deposit certificate number mismatch with SBI records."
        },
        headers=BANK_NODAL_HEADERS
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["action"] == "rejected"
    assert reject_res.json()["trust_tier"] == 1
    assert reject_res.json()["verification_status"] == "rejected"

    # Verify FDR status in store
    fdr_res = client.get("/api/v1/fdrs/fdr-001", headers=INST_USER_HEADERS)
    assert fdr_res.json()["trust_tier"] == 1
    assert fdr_res.json()["verification_status"] == "rejected"

def test_tier3_ed25519_signature_success():
    """Test valid Ed25519 digital signature promotes FDR to Trust Tier 3"""
    fdr = fdr_service.get_fdr_by_id("fdr-001")
    payload, sig_hex = MockBankSigningService.generate_signed_payload("SBIN", fdr)

    res = client.post(
        "/api/v1/bank/attestations",
        json={
            "fdr_id": "fdr-001",
            "signed_payload": payload,
            "signature_hex": sig_hex
        },
        headers=BANK_NODAL_HEADERS
    )
    assert res.status_code == 200
    data = res.json()
    assert data["trust_tier"] == 3
    assert data["verification_status"] == "signature_verified"

    # Verify FDR state in store
    fdr_check = client.get("/api/v1/fdrs/fdr-001", headers=INST_USER_HEADERS)
    assert fdr_check.json()["trust_tier"] == 3
    assert fdr_check.json()["verification_status"] == "signature_verified"

def test_tier3_signature_negative_tampered_payload():
    """Test that valid signature over tampered payload data is strictly rejected"""
    fdr = fdr_service.get_fdr_by_id("fdr-001")
    payload, sig_hex = MockBankSigningService.generate_signed_payload("SBIN", fdr)

    # Tamper with amount: increase from 25,000,000 to 50,000,000
    payload["amount"] = "50000000.00"

    res = client.post(
        "/api/v1/bank/attestations",
        json={
            "fdr_id": "fdr-001",
            "signed_payload": payload,
            "signature_hex": sig_hex
        },
        headers=BANK_NODAL_HEADERS
    )
    # Cryptographic check fails because bytes changed
    assert res.status_code in [400, 401, 422]

def test_tier3_signature_negative_invalid_signature():
    """Test that corrupted signature bytes are rejected"""
    fdr = fdr_service.get_fdr_by_id("fdr-001")
    payload, _ = MockBankSigningService.generate_signed_payload("SBIN", fdr)
    corrupted_sig = "00" * 64

    res = client.post(
        "/api/v1/bank/attestations",
        json={
            "fdr_id": "fdr-001",
            "signed_payload": payload,
            "signature_hex": corrupted_sig
        },
        headers=BANK_NODAL_HEADERS
    )
    assert res.status_code == 401
    assert "verification failed" in res.json()["detail"].lower()

def test_tier3_signature_negative_unknown_key_id():
    """Test that unknown public key ID is rejected"""
    fdr = fdr_service.get_fdr_by_id("fdr-001")
    payload, sig_hex = MockBankSigningService.generate_signed_payload("SBIN", fdr)
    payload["key_id"] = "FAKE-KEY-UNKNOWN-999"

    res = client.post(
        "/api/v1/bank/attestations",
        json={
            "fdr_id": "fdr-001",
            "signed_payload": payload,
            "signature_hex": sig_hex
        },
        headers=BANK_NODAL_HEADERS
    )
    assert res.status_code == 404
    assert "not registered" in res.json()["detail"].lower()

def test_tier3_signature_negative_nonce_replay():
    """Test that replaying a previously accepted nonce is rejected"""
    fdr = fdr_service.get_fdr_by_id("fdr-001")
    payload, sig_hex = MockBankSigningService.generate_signed_payload("SBIN", fdr)

    # First submission
    res1 = client.post(
        "/api/v1/bank/attestations",
        json={
            "fdr_id": "fdr-001",
            "signed_payload": payload,
            "signature_hex": sig_hex
        },
        headers=BANK_NODAL_HEADERS
    )
    assert res1.status_code == 200

    # Replay submission with same nonce
    res2 = client.post(
        "/api/v1/bank/attestations",
        json={
            "fdr_id": "fdr-001",
            "signed_payload": payload,
            "signature_hex": sig_hex
        },
        headers=BANK_NODAL_HEADERS
    )
    assert res2.status_code == 409
    assert "replay detected" in res2.json()["detail"].lower()

def test_admin_bank_key_management():
    """Test listing, registering, and revoking bank public keys"""
    # 1. List keys
    list_res = client.get("/api/v1/admin/bank-keys", headers=ADMIN_HEADERS)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 6

    # 2. Register new key
    new_keypair = MockBankSigningService.generate_new_keypair()
    reg_res = client.post(
        "/api/v1/admin/bank-keys",
        json={
            "bank_id": "bank-01",
            "key_id": "SBIN-ROTATED-TEST-KEY",
            "algorithm": "Ed25519",
            "public_key_pem": new_keypair["public_key_pem"],
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=180)).isoformat()
        },
        headers=ADMIN_HEADERS
    )
    assert reg_res.status_code == 201
    assert reg_res.json()["key_id"] == "SBIN-ROTATED-TEST-KEY"

    # 3. Revoke key
    revoke_res = client.patch(
        "/api/v1/admin/bank-keys/SBIN-ROTATED-TEST-KEY/revoke",
        json={"revocation_reason": "Scheduled annual cryptographic key retirement."},
        headers=ADMIN_HEADERS
    )
    assert revoke_res.status_code == 200
    assert revoke_res.json()["is_revoked"] is True
    assert "retirement" in revoke_res.json()["revocation_reason"]

def test_fdr_attestations_history():
    """Test retrieving historical attestations for an FDR"""
    # Create request and confirm
    req_res = client.post("/api/v1/fdrs/fdr-001/verification-requests", headers=INST_USER_HEADERS)
    token = req_res.json()["raw_token"]
    client.post(
        "/api/v1/bank/verification/confirm",
        json={"token": token, "action": "confirm"},
        headers=BANK_NODAL_HEADERS
    )

    # Get attestations
    att_res = client.get("/api/v1/fdrs/fdr-001/attestations", headers=INST_USER_HEADERS)
    assert att_res.status_code == 200
    attestations = att_res.json()
    assert len(attestations) >= 1
    assert attestations[0]["trust_tier"] == 2
    assert attestations[0]["verification_status"] == "bank_confirmed"
